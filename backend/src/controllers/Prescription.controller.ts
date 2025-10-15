import { Request, Response, NextFunction } from 'express';
import PrescriptionRepository from '../repositories/Prescription.repository';
import  ApiResponse  from '../utils/ApiResponse';
import  AppError  from '../utils/AppError';
import  errorHandler  from '../utils/errorHandler';
import { PrescriptionStatus, PrescriptionItemStatus, DrugCategory, DrugForm, UserRole } from '@prisma/client';
import { sendPrescriptionNotification } from '../services/whatsapp.service';
import { PrescriptionPDFService } from '../services/prescriptionPDF.service';
import s3 from '../services/s3client';
import prisma from '../utils/dbConfig';

// Same roles array as patient creation
const roles: string[] = [
	UserRole.SUPER_ADMIN,
	UserRole.HOSPITAL_ADMIN,
	UserRole.DOCTOR,
	UserRole.RECEPTIONIST,
	UserRole.SALES_PERSON,
	UserRole.PHARMACIST
];

export class PrescriptionController {
  // ========================================
  // DRUG MANAGEMENT
  // ========================================

  async createDrug(req: Request, res: Response, next: NextFunction) {
    // Apply the SAME SUCCESSFUL PATTERN as patient creation
    if (req.user && roles.includes(req.user.role)) {
      try {
        const {
          name,
          genericName,
          brandName,
          category,
          form,
          strength,
          unit,
          description,
          isControlledSubstance,
          requiresPrescription,
          currentStock,
          minimumStock,
          maximumStock,
          reorderLevel,
          unitPrice,
          costPrice,
          contraindications,
          sideEffects,
          warnings,
        } = req.body;

        // Hospital validation (same as patient creation)
        const hospitalId = req.user.hospitalId;
        if (!hospitalId) {
          throw new AppError("User ain't linked to any hospital", 400);
        }

        // User existence check (same as patient creation)
        const userExists = await prisma.hospitalStaff.findUnique({
          where: { id: req.user.id },
          select: { id: true }
        });

        // Validation
        if (!name || !category || !form || !strength || !unit) {
          throw new AppError('Required fields: name, category, form, strength, unit', 400);
        }

        const drug = await PrescriptionRepository.createDrug({
          name,
          genericName,
          brandName,
          category,
          form,
          strength,
          unit,
          description,
          isControlledSubstance: isControlledSubstance || false,
          requiresPrescription: requiresPrescription !== false,
          currentStock: currentStock || 0,
          minimumStock: minimumStock || 0,
          maximumStock: maximumStock || 0,
          reorderLevel: reorderLevel || 0,
          unitPrice,
          costPrice,
          contraindications,
          sideEffects,
          warnings,
          hospitalId,
          createdBy: userExists ? req.user.id : null // Same pattern as patient creation
        });

        res.status(201).json(new ApiResponse('Drug created successfully', drug));
      } catch (error: any) {
        console.error("Error creating drug:", error);
        res.status(error.code || 500).json(new ApiResponse(error.message || "Internal Server Error"));
      }
    } else {
      res.status(403).json(new ApiResponse("Unauthorized access"));
    }
  }

  async getAllDrugs(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, isActive, isControlledSubstance, search } = req.query;

      const filters: any = {};
      if (category) filters.category = category;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (isControlledSubstance !== undefined) filters.isControlledSubstance = isControlledSubstance === 'true';
      if (search) filters.search = search as string;

      const drugs = await PrescriptionRepository.getAllDrugs(filters);

      res.status(200).json(new ApiResponse('Drugs fetched successfully', drugs));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async getDrugById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const drug = await PrescriptionRepository.getDrugById(id);
      if (!drug) {
        throw new AppError('Drug not found', 404);
      }

      res.status(200).json(new ApiResponse('Drug fetched successfully', drug));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async updateDrug(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const drug = await PrescriptionRepository.updateDrug(id, updateData);

      res.status(200).json(new ApiResponse('Drug updated successfully', drug));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async deleteDrug(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await PrescriptionRepository.deleteDrug(id);

      res.status(200).json(new ApiResponse('Drug deleted successfully', null));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  // ========================================
  // DRUG INTERACTION MANAGEMENT
  // ========================================

  async createDrugInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const { drug1Id, drug2Id, severity, description, action } = req.body;

      if (!drug1Id || !drug2Id || !severity || !description || !action) {
        throw new AppError('All fields are required', 400);
      }

      if (drug1Id === drug2Id) {
        throw new AppError('Drug cannot interact with itself', 400);
      }

      const interaction = await PrescriptionRepository.createDrugInteraction({
        drug1Id,
        drug2Id,
        severity,
        description,
        action,
      });

      res.status(201).json(new ApiResponse('Drug interaction created successfully', interaction));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async checkDrugInteractions(req: Request, res: Response, next: NextFunction) {
    try {
      const { drugIds } = req.body;

      if (!Array.isArray(drugIds) || drugIds.length < 2) {
        throw new AppError('At least 2 drug IDs are required', 400);
      }

      const interactions = await PrescriptionRepository.checkDrugInteractions(drugIds);

      res.status(200).json(new ApiResponse('Drug interactions checked successfully', interactions));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async getAllDrugInteractions(req: Request, res: Response, next: NextFunction) {
    try {
      const interactions = await PrescriptionRepository.getAllDrugInteractions();

      res.status(200).json(new ApiResponse('Drug interactions fetched successfully', interactions));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  // ========================================
  // PRESCRIPTION MANAGEMENT
  // ========================================

  async createPrescription(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        patientId,
        doctorId,
        hospitalId,
        diagnosis,
        notes,
        instructions,
        validUntil,
        admissionId,
        visitId,
        items,
      } = req.body;

      // Validation
      if (!patientId || !doctorId || !hospitalId || !validUntil || !items || !Array.isArray(items)) {
        throw new AppError('Required fields: patientId, doctorId, hospitalId, validUntil, items', 400);
      }

      if (items.length === 0) {
        throw new AppError('At least one prescription item is required', 400);
      }

      // Validate items
      for (const item of items) {
        if (!item.drugId || !item.dosage || !item.frequency || !item.duration || !item.quantity || !item.unit) {
          throw new AppError('Each item must have: drugId, dosage, frequency, duration, quantity, unit', 400);
        }
      }

      // Check drug interactions
      const drugIds = items.map((item: any) => item.drugId);
      const interactions = await PrescriptionRepository.checkDrugInteractions(drugIds);

      // Generate prescription number
      const prescriptionNumber = await this.generatePrescriptionNumber();

      const prescription = await PrescriptionRepository.createPrescription({
        prescriptionNumber,
        patientId,
        doctorId,
        hospitalId,
        diagnosis,
        notes,
        instructions,
        validUntil: new Date(validUntil),
        admissionId,
        visitId,
        items,
      });

      // Generate PDF and send WhatsApp notification
      try {
        // Get prescription with all related data for PDF generation
        const prescriptionWithDetails = await PrescriptionRepository.getPrescriptionById(prescription.id);
        
        if (prescriptionWithDetails) {
          // Generate prescription PDF
          const pdfBuffer = await PrescriptionPDFService.generatePrescriptionPDF(prescriptionWithDetails);
          
          // Upload PDF to S3
          const fileName = `prescription-${prescription.prescriptionNumber}-${Date.now()}.pdf`;
          const s3Url = await s3.uploadStream(
            pdfBuffer,
            fileName,
            "application/pdf"
          );

          // Send WhatsApp notification to patient
          if (prescriptionWithDetails.patient.phone) {
            await sendPrescriptionNotification(prescriptionWithDetails.patient.phone, {
              patientName: prescriptionWithDetails.patient.name,
              doctorName: prescriptionWithDetails.doctor.name,
              prescriptionNumber: prescription.prescriptionNumber,
              prescriptionDate: prescription.createdAt,
              hospitalName: prescriptionWithDetails.hospital.name,
              prescriptionUrl: s3Url,
              validUntil: prescription.validUntil,
              medicinesCount: prescriptionWithDetails.items.length,
            });
          }
        }
      } catch (notificationError) {
        console.error('Prescription notification failed:', notificationError);
        // Don't fail the prescription creation if notification fails
      }

      // Add interactions to response if any
      const response = {
        prescription,
        drugInteractions: interactions,
        warnings: interactions.length > 0 ? 'Drug interactions detected. Please review.' : null,
      };

      res.status(201).json(new ApiResponse('Prescription created successfully', response));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async getPrescriptionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const prescription = await PrescriptionRepository.getPrescriptionById(id);
      if (!prescription) {
        throw new AppError('Prescription not found', 404);
      }

      res.status(200).json(new ApiResponse('Prescription fetched successfully', prescription));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async getPrescriptionByNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { prescriptionNumber } = req.params;

      const prescription = await PrescriptionRepository.getPrescriptionByNumber(prescriptionNumber);
      if (!prescription) {
        throw new AppError('Prescription not found', 404);
      }

      res.status(200).json(new ApiResponse('Prescription fetched successfully', prescription));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async getPatientPrescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = req.params;
      const { status, admissionId, visitId, dateFrom, dateTo } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (admissionId) filters.admissionId = admissionId as string;
      if (visitId) filters.visitId = visitId as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);

      const prescriptions = await PrescriptionRepository.getPatientPrescriptions(patientId, filters);

      res.status(200).json(new ApiResponse('Patient prescriptions fetched successfully', prescriptions));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async getDoctorPrescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const { doctorId } = req.params;
      const { status, dateFrom, dateTo } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);

      const prescriptions = await PrescriptionRepository.getDoctorPrescriptions(doctorId, filters);

      res.status(200).json(new ApiResponse('Doctor prescriptions fetched successfully', prescriptions));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async updatePrescriptionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, description } = req.body;
      const performedBy = (req as any).user?.id;

      if (!status || !performedBy) {
        throw new AppError('Status and performedBy are required', 400);
      }

      const prescription = await PrescriptionRepository.updatePrescriptionStatus(
        id,
        status,
        performedBy,
        description
      );

      res.status(200).json(new ApiResponse('Prescription status updated successfully', prescription));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async updatePrescriptionItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { itemId } = req.params;
      const { status, dispensedQuantity } = req.body;

      if (!status) {
        throw new AppError('Status is required', 400);
      }

      const item = await PrescriptionRepository.updatePrescriptionItemStatus(
        itemId,
        status,
        dispensedQuantity
      );

      res.status(200).json(new ApiResponse('Prescription item status updated successfully', item));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async getExpiredPrescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const prescriptions = await PrescriptionRepository.getExpiredPrescriptions();

      res.status(200).json(new ApiResponse('Expired prescriptions fetched successfully', prescriptions));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async markPrescriptionsAsExpired(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await PrescriptionRepository.markPrescriptionsAsExpired();

      res.status(200).json(new ApiResponse(`${count} prescriptions marked as expired`, { count }));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  // ========================================
  // STOCK MANAGEMENT
  // ========================================

  async updateDrugStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantityChange, operation } = req.body;

      if (!quantityChange || !operation || !['ADD', 'SUBTRACT'].includes(operation)) {
        throw new AppError('quantityChange and operation (ADD/SUBTRACT) are required', 400);
      }

      const drug = await PrescriptionRepository.updateDrugStock(id, quantityChange, operation);

      res.status(200).json(new ApiResponse('Drug stock updated successfully', drug));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  async getLowStockDrugs(req: Request, res: Response, next: NextFunction) {
    try {
      const drugs = await PrescriptionRepository.getLowStockDrugs();

      res.status(200).json(new ApiResponse('Low stock drugs fetched successfully', drugs));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  // ========================================
  // DASHBOARD & ANALYTICS
  // ========================================

  async getPrescriptionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { hospitalId } = req.params;
      const { dateFrom, dateTo } = req.query;

      const stats = await PrescriptionRepository.getPrescriptionStats(
        hospitalId,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      res.status(200).json(new ApiResponse('Prescription statistics fetched successfully', stats));
    } catch (error) {
      errorHandler(error, res);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private async generatePrescriptionNumber(): Promise<string> {
    const prefix = 'RX';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
}

export default new PrescriptionController();
