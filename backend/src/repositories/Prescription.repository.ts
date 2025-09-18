import { PrismaClient, Drug, Prescription, PrescriptionItem, DrugInteraction, PrescriptionStatus, PrescriptionItemStatus, DrugCategory, DrugForm } from '@prisma/client';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

export class PrescriptionRepository {
  // ========================================
  // DRUG MANAGEMENT
  // ========================================

  async createDrug(drugData: {
    name: string;
    genericName?: string;
    brandName?: string;
    category: DrugCategory;
    form: DrugForm;
    strength: string;
    unit: string;
    description?: string;
    isControlledSubstance?: boolean;
    requiresPrescription?: boolean;
    currentStock?: number;
    minimumStock?: number;
    maximumStock?: number;
    reorderLevel?: number;
    unitPrice?: number;
    costPrice?: number;
    contraindications?: string;
    sideEffects?: string;
    warnings?: string;
  }): Promise<Drug> {
    try {
      return await prisma.drug.create({
        data: drugData,
      });
    } catch (error) {
      throw new AppError('Failed to create drug', 500);
    }
  }

  async getAllDrugs(filters?: {
    category?: DrugCategory;
    isActive?: boolean;
    isControlledSubstance?: boolean;
    search?: string;
  }): Promise<Drug[]> {
    try {
      const where: any = {};

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters?.isControlledSubstance !== undefined) {
        where.isControlledSubstance = filters.isControlledSubstance;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { genericName: { contains: filters.search, mode: 'insensitive' } },
          { brandName: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      return await prisma.drug.findMany({
        where,
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      throw new AppError('Failed to fetch drugs', 500);
    }
  }

  async getDrugById(id: string): Promise<Drug | null> {
    try {
      return await prisma.drug.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new AppError('Failed to fetch drug', 500);
    }
  }

  async updateDrug(id: string, updateData: Partial<Drug>): Promise<Drug> {
    try {
      return await prisma.drug.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      throw new AppError('Failed to update drug', 500);
    }
  }

  async deleteDrug(id: string): Promise<void> {
    try {
      await prisma.drug.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      throw new AppError('Failed to delete drug', 500);
    }
  }

  // ========================================
  // DRUG INTERACTION MANAGEMENT
  // ========================================

  async createDrugInteraction(interactionData: {
    drug1Id: string;
    drug2Id: string;
    severity: string;
    description: string;
    action: string;
  }): Promise<DrugInteraction> {
    try {
      return await prisma.drugInteraction.create({
        data: interactionData,
        include: {
          drug1: true,
          drug2: true,
        },
      });
    } catch (error) {
      throw new AppError('Failed to create drug interaction', 500);
    }
  }

  async checkDrugInteractions(drugIds: string[]): Promise<DrugInteraction[]> {
    try {
      if (drugIds.length < 2) return [];

      const interactions = await prisma.drugInteraction.findMany({
        where: {
          OR: [
            {
              AND: [
                { drug1Id: { in: drugIds } },
                { drug2Id: { in: drugIds } },
              ],
            },
          ],
        },
        include: {
          drug1: true,
          drug2: true,
        },
      });

      // Filter to only include interactions between the provided drugs
      return interactions.filter(interaction => 
        drugIds.includes(interaction.drug1Id) && 
        drugIds.includes(interaction.drug2Id) &&
        interaction.drug1Id !== interaction.drug2Id
      );
    } catch (error) {
      throw new AppError('Failed to check drug interactions', 500);
    }
  }

  async getAllDrugInteractions(): Promise<DrugInteraction[]> {
    try {
      return await prisma.drugInteraction.findMany({
        include: {
          drug1: true,
          drug2: true,
        },
        orderBy: { severity: 'desc' },
      });
    } catch (error) {
      throw new AppError('Failed to fetch drug interactions', 500);
    }
  }

  // ========================================
  // PRESCRIPTION MANAGEMENT
  // ========================================

  async createPrescription(prescriptionData: {
    prescriptionNumber: string;
    patientId: string;
    doctorId: string;
    hospitalId: string;
    diagnosis?: string;
    notes?: string;
    instructions?: string;
    validUntil: Date;
    admissionId?: string;
    visitId?: string;
    items: {
      drugId: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      unit: string;
      route?: string;
      timing?: string;
      specialInstructions?: string;
    }[];
  }): Promise<Prescription> {
    try {
      return await prisma.prescription.create({
        data: {
          prescriptionNumber: prescriptionData.prescriptionNumber,
          patientId: prescriptionData.patientId,
          doctorId: prescriptionData.doctorId,
          hospitalId: prescriptionData.hospitalId,
          diagnosis: prescriptionData.diagnosis,
          notes: prescriptionData.notes,
          instructions: prescriptionData.instructions,
          validUntil: prescriptionData.validUntil,
          admissionId: prescriptionData.admissionId,
          visitId: prescriptionData.visitId,
          items: {
            create: prescriptionData.items,
          },
          history: {
            create: {
              action: 'CREATED',
              description: 'Prescription created',
              performedBy: prescriptionData.doctorId,
            },
          },
        },
        include: {
          patient: true,
          doctor: true,
          hospital: true,
          admission: true,
          visit: true,
          items: {
            include: {
              drug: true,
            },
          },
          history: true,
        },
      });
    } catch (error) {
      throw new AppError('Failed to create prescription', 500);
    }
  }

  async getPrescriptionById(id: string): Promise<Prescription | null> {
    try {
      return await prisma.prescription.findUnique({
        where: { id },
        include: {
          patient: true,
          doctor: true,
          hospital: true,
          admission: true,
          visit: true,
          items: {
            include: {
              drug: true,
            },
          },
          history: {
            orderBy: { performedAt: 'desc' },
          },
        },
      });
    } catch (error) {
      throw new AppError('Failed to fetch prescription', 500);
    }
  }

  async getPrescriptionByNumber(prescriptionNumber: string): Promise<Prescription | null> {
    try {
      return await prisma.prescription.findUnique({
        where: { prescriptionNumber },
        include: {
          patient: true,
          doctor: true,
          hospital: true,
          admission: true,
          visit: true,
          items: {
            include: {
              drug: true,
            },
          },
          history: {
            orderBy: { performedAt: 'desc' },
          },
        },
      });
    } catch (error) {
      throw new AppError('Failed to fetch prescription', 500);
    }
  }

  async getPatientPrescriptions(patientId: string, filters?: {
    status?: PrescriptionStatus;
    admissionId?: string;
    visitId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Prescription[]> {
    try {
      const where: any = { patientId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.admissionId) {
        where.admissionId = filters.admissionId;
      }

      if (filters?.visitId) {
        where.visitId = filters.visitId;
      }

      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.createdAt.lte = filters.dateTo;
        }
      }

      return await prisma.prescription.findMany({
        where,
        include: {
          patient: true,
          doctor: true,
          hospital: true,
          admission: true,
          visit: true,
          items: {
            include: {
              drug: true,
            },
          },
          history: {
            orderBy: { performedAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new AppError('Failed to fetch patient prescriptions', 500);
    }
  }

  async getDoctorPrescriptions(doctorId: string, filters?: {
    status?: PrescriptionStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Prescription[]> {
    try {
      const where: any = { doctorId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.createdAt.lte = filters.dateTo;
        }
      }

      return await prisma.prescription.findMany({
        where,
        include: {
          patient: true,
          doctor: true,
          hospital: true,
          admission: true,
          visit: true,
          items: {
            include: {
              drug: true,
            },
          },
          history: {
            orderBy: { performedAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new AppError('Failed to fetch doctor prescriptions', 500);
    }
  }

  async updatePrescriptionStatus(id: string, status: PrescriptionStatus, performedBy: string, description?: string): Promise<Prescription> {
    try {
      const prescription = await prisma.prescription.update({
        where: { id },
        data: { status },
        include: {
          patient: true,
          doctor: true,
          hospital: true,
          admission: true,
          visit: true,
          items: {
            include: {
              drug: true,
            },
          },
        },
      });

      // Add to history
      await prisma.prescriptionHistory.create({
        data: {
          prescriptionId: id,
          action: status,
          description: description || `Prescription status changed to ${status}`,
          performedBy,
        },
      });

      return prescription;
    } catch (error) {
      throw new AppError('Failed to update prescription status', 500);
    }
  }

  async updatePrescriptionItemStatus(itemId: string, status: PrescriptionItemStatus, dispensedQuantity?: number): Promise<PrescriptionItem> {
    try {
      const updateData: any = { status };
      if (dispensedQuantity !== undefined) {
        updateData.dispensedQuantity = dispensedQuantity;
      }

      return await prisma.prescriptionItem.update({
        where: { id: itemId },
        data: updateData,
        include: {
          drug: true,
          prescription: true,
        },
      });
    } catch (error) {
      throw new AppError('Failed to update prescription item status', 500);
    }
  }

  async getExpiredPrescriptions(): Promise<Prescription[]> {
    try {
      return await prisma.prescription.findMany({
        where: {
          validUntil: {
            lt: new Date(),
          },
          status: {
            not: 'EXPIRED',
          },
        },
        include: {
          patient: true,
          doctor: true,
          items: {
            include: {
              drug: true,
            },
          },
        },
      });
    } catch (error) {
      throw new AppError('Failed to fetch expired prescriptions', 500);
    }
  }

  async markPrescriptionsAsExpired(): Promise<number> {
    try {
      const result = await prisma.prescription.updateMany({
        where: {
          validUntil: {
            lt: new Date(),
          },
          status: {
            not: 'EXPIRED',
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      return result.count;
    } catch (error) {
      throw new AppError('Failed to mark prescriptions as expired', 500);
    }
  }

  // ========================================
  // STOCK MANAGEMENT
  // ========================================

  async updateDrugStock(drugId: string, quantityChange: number, operation: 'ADD' | 'SUBTRACT'): Promise<Drug> {
    try {
      const drug = await prisma.drug.findUnique({
        where: { id: drugId },
      });

      if (!drug) {
        throw new AppError('Drug not found', 404);
      }

      const newStock = operation === 'ADD' 
        ? drug.currentStock + quantityChange 
        : drug.currentStock - quantityChange;

      if (newStock < 0) {
        throw new AppError('Insufficient stock', 400);
      }

      return await prisma.drug.update({
        where: { id: drugId },
        data: { currentStock: newStock },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update drug stock', 500);
    }
  }

  async getLowStockDrugs(): Promise<Drug[]> {
    try {
      return await prisma.drug.findMany({
        where: {
          isActive: true,
          currentStock: {
            lte: prisma.drug.fields.reorderLevel,
          },
        },
        orderBy: { currentStock: 'asc' },
      });
    } catch (error) {
      throw new AppError('Failed to fetch low stock drugs', 500);
    }
  }

  // ========================================
  // DASHBOARD & ANALYTICS
  // ========================================

  async getPrescriptionStats(hospitalId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    totalPrescriptions: number;
    activePrescriptions: number;
    completedPrescriptions: number;
    expiredPrescriptions: number;
    totalDrugs: number;
    lowStockDrugs: number;
    topPrescribedDrugs: Array<{ drug: Drug; count: number }>;
  }> {
    try {
      const where: any = { hospitalId };
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const [
        totalPrescriptions,
        activePrescriptions,
        completedPrescriptions,
        expiredPrescriptions,
        totalDrugs,
        lowStockDrugs,
        topPrescribedDrugs,
      ] = await Promise.all([
        prisma.prescription.count({ where }),
        prisma.prescription.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.prescription.count({ where: { ...where, status: 'COMPLETED' } }),
        prisma.prescription.count({ where: { ...where, status: 'EXPIRED' } }),
        prisma.drug.count({ where: { isActive: true } }),
        prisma.drug.count({
          where: {
            isActive: true,
            currentStock: { lte: prisma.drug.fields.reorderLevel },
          },
        }),
        prisma.prescriptionItem.groupBy({
          by: ['drugId'],
          where: {
            prescription: where,
          },
          _count: { drugId: true },
          orderBy: { _count: { drugId: 'desc' } },
          take: 10,
        }),
      ]);

      const topDrugs = await Promise.all(
        topPrescribedDrugs.map(async (item) => {
          const drug = await prisma.drug.findUnique({
            where: { id: item.drugId },
          });
          return { drug: drug!, count: item._count.drugId };
        })
      );

      return {
        totalPrescriptions,
        activePrescriptions,
        completedPrescriptions,
        expiredPrescriptions,
        totalDrugs,
        lowStockDrugs,
        topPrescribedDrugs: topDrugs,
      };
    } catch (error) {
      throw new AppError('Failed to fetch prescription statistics', 500);
    }
  }
}

export default new PrescriptionRepository();
