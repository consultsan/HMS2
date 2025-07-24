import { Router, Request, Response } from "express";
import { PDFService } from "../services/pdf.service";

const router = Router();

// Test endpoint to verify Puppeteer PDF generation
router.get("/test-pdf", async (req: Request, res: Response) => {
    try {
        const pdfBuffer = await PDFService.generateTestPDF();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=test-puppeteer.pdf");
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error("Test PDF generation error:", error);
        res.status(500).json({
            error: "Failed to generate test PDF",
            details: error.message
        });
    }
});

export default router; 