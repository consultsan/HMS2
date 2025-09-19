import { Request, Response } from "express";
import prisma from "../utils/dbConfig";
import googleMapsService from "../services/googleMaps.service";
import ApiResponse from "../utils/ApiResponse";
import AppError from "../utils/AppError";

export class HospitalLocationController {
  /**
   * Update hospital location data (coordinates and place ID)
   */
  async updateHospitalLocation(req: Request, res: Response) {
    try {
      const { hospitalId } = req.params;
      const { address } = req.body;

      if (!hospitalId || !address) {
        return res.status(400).json(
          new ApiResponse("Hospital ID and address are required")
        );
      }

      // Get hospital details
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: { id: true, name: true, address: true }
      });

      if (!hospital) {
        return res.status(404).json(
          new ApiResponse("Hospital not found")
        );
      }

      // Get location data from Google Maps
      const locationData = await googleMapsService.getHospitalLocationData(
        hospital.name,
        address
      );

      // Update hospital with location data
      const updatedHospital = await prisma.hospital.update({
        where: { id: hospitalId },
        data: {
          address: address,
          latitude: locationData.coordinates?.latitude || null,
          longitude: locationData.coordinates?.longitude || null,
          googlePlaceId: locationData.placeId || null,
        },
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
          googlePlaceId: true,
        }
      });

      res.json(
        new ApiResponse("Hospital location updated successfully", {
          hospital: updatedHospital,
          mapsLink: locationData.mapsLink,
          embedLink: locationData.embedLink,
        })
      );
    } catch (error: any) {
      console.error("Update hospital location error:", error);
      res.status(error.code || 500).json(
        new ApiResponse(error.message || "Internal Server Error")
      );
    }
  }

  /**
   * Get hospital location data
   */
  async getHospitalLocation(req: Request, res: Response) {
    try {
      const { hospitalId } = req.params;

      if (!hospitalId) {
        return res.status(400).json(
          new ApiResponse("Hospital ID is required")
        );
      }

      // Get hospital details
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
          googlePlaceId: true,
        }
      });

      if (!hospital) {
        return res.status(404).json(
          new ApiResponse("Hospital not found")
        );
      }

      // Generate maps links
      const mapsLink = googleMapsService.generateMapsLink(
        hospital.googlePlaceId || undefined,
        hospital.address,
        hospital.latitude && hospital.longitude ? {
          latitude: hospital.latitude,
          longitude: hospital.longitude
        } : undefined
      );

      const embedLink = googleMapsService.generateEmbedLink(
        hospital.googlePlaceId || undefined,
        hospital.address,
        hospital.latitude && hospital.longitude ? {
          latitude: hospital.latitude,
          longitude: hospital.longitude
        } : undefined
      );

      res.json(
        new ApiResponse("Hospital location retrieved successfully", {
          hospital,
          mapsLink,
          embedLink,
        })
      );
    } catch (error: any) {
      console.error("Get hospital location error:", error);
      res.status(error.code || 500).json(
        new ApiResponse(error.message || "Internal Server Error")
      );
    }
  }

  /**
   * Get all hospitals with location data
   */
  async getAllHospitalsWithLocation(req: Request, res: Response) {
    try {
      const hospitals = await prisma.hospital.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          contactNumber: true,
          email: true,
          latitude: true,
          longitude: true,
          googlePlaceId: true,
          status: true,
        },
        where: {
          status: "ACTIVE"
        }
      });

      // Add maps links for each hospital
      const hospitalsWithLocation = hospitals.map(hospital => {
        const mapsLink = googleMapsService.generateMapsLink(
          hospital.googlePlaceId || undefined,
          hospital.address,
          hospital.latitude && hospital.longitude ? {
            latitude: hospital.latitude,
            longitude: hospital.longitude
          } : undefined
        );

        const embedLink = googleMapsService.generateEmbedLink(
          hospital.googlePlaceId || undefined,
          hospital.address,
          hospital.latitude && hospital.longitude ? {
            latitude: hospital.latitude,
            longitude: hospital.longitude
          } : undefined
        );

        return {
          ...hospital,
          mapsLink,
          embedLink,
        };
      });

      res.json(
        new ApiResponse("Hospitals with location retrieved successfully", hospitalsWithLocation)
      );
    } catch (error: any) {
      console.error("Get all hospitals with location error:", error);
      res.status(error.code || 500).json(
        new ApiResponse(error.message || "Internal Server Error")
      );
    }
  }

  /**
   * Test Google Maps integration
   */
  async testGoogleMapsIntegration(req: Request, res: Response) {
    try {
      const { address, hospitalName } = req.body;

      if (!address) {
        return res.status(400).json(
          new ApiResponse("Address is required for testing")
        );
      }

      const testHospitalName = hospitalName || "Test Hospital";
      
      // Test Google Maps integration
      const locationData = await googleMapsService.getHospitalLocationData(
        testHospitalName,
        address
      );

      res.json(
        new ApiResponse("Google Maps integration test successful", {
          input: {
            hospitalName: testHospitalName,
            address,
          },
          output: locationData,
        })
      );
    } catch (error: any) {
      console.error("Google Maps integration test error:", error);
      res.status(error.code || 500).json(
        new ApiResponse(error.message || "Google Maps integration test failed")
      );
    }
  }
}

export default new HospitalLocationController();
