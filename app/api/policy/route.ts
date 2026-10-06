import { logError } from "@/lib/logger";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const spreadsheetId = "1zQECoRDREhG5ka_E1gIBFpSzuqIwU5Nzg09OXB7tZG0";
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

        const response = await fetch(url, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error("Failed to fetch policy from spreadsheet");
        }

        const csvData = await response.text();

        // Robust CSV parser that handles quoted newlines, escaped quotes, and multiple columns
        const rows: string[][] = [];
        let currentLine: string[] = [];
        let currentCell = "";
        let inQuotes = false;

        for (let i = 0; i < csvData.length; i++) {
            const char = csvData[i];
            const nextChar = csvData[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote: "" -> "
                    currentCell += '"';
                    i++;
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // New column
                currentLine.push(currentCell.trim());
                currentCell = "";
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                // New row
                currentCell = currentCell.trim();
                currentLine.push(currentCell);

                rows.push(currentLine);

                currentLine = [];
                currentCell = "";

                // Handle CRLF sequence
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            } else {
                currentCell += char;
            }
        }

        // Final row and cell handling
        currentCell = currentCell.trim();
        if (currentCell !== "" || currentLine.length > 0) {
            currentLine.push(currentCell);
            rows.push(currentLine);
        }

        // Remove header row and extract first column (the policy text)
        // filter out rows that are entirely empty or purely whitespace
        const policyParagraphs = rows.slice(1)
            .map(row => row[0])
            .filter(text => text !== undefined && text.trim().length > 0);

        if (policyParagraphs.length === 0) {
            return NextResponse.json({ policy: ["No policy content available."] });
        }

        return NextResponse.json({ policy: policyParagraphs });
    } catch (error) {
        logError("/api/policy", error);
        return NextResponse.json(
            { error: "Unable to load the latest policy at this moment." },
            { status: 500 }
        );
    }
}
