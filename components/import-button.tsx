"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useWeightTracker, Entry } from "@/components/weight-tracker-context"
import { Upload } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"

type ImportDataType = {
  type: 'json' | 'csv';
  content: string;
  entries: number;
}

export function ImportButton() {
  const { toast } = useToast()
  const { restoreData } = useWeightTracker()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Create a reference to the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Function to trigger the file input
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string
        
        // Check if it's a JSON or CSV file
        if (file.name.endsWith('.json')) {
          // Handle JSON data
          try {
            // Check if valid JSON
            const jsonData = JSON.parse(fileContent)
            
            // Store the data temporarily and open confirmation dialog
            setImportData({
              type: 'json',
              content: fileContent,
              entries: jsonData.entries?.length || 0
            })
            setIsDialogOpen(true)
          } catch (error) {
            toast({
              title: "Import Failed",
              description: "The JSON file contains invalid data format.",
              variant: "destructive"
            })
          }
        } else if (file.name.endsWith('.csv')) {
          // Handle CSV data
          try {
            // Process CSV format
            const lines = fileContent.split('\n')
            const dataLines = lines.filter(line => !line.startsWith('#') && line.trim() !== '')
            
            if (dataLines.length < 2) {
              throw new Error("CSV file has no data rows")
            }
            
            // Parse header and data rows
            const headers = dataLines[0].split(',')
            const dataRows = dataLines.slice(1)
            
            // Store the data temporarily and open confirmation dialog
            setImportData({
              type: 'csv',
              content: fileContent,
              entries: dataRows.length
            })
            setIsDialogOpen(true)
          } catch (error) {
            toast({
              title: "Import Failed",
              description: "The CSV file has an invalid format.",
              variant: "destructive"
            })
          }
        } else {
          toast({
            title: "Import Failed",
            description: "Please upload a JSON or CSV file.",
            variant: "destructive"
          })
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to read the file.",
          variant: "destructive"
        })
      }
    }
    
    reader.readAsText(file)
    
    // Reset the file input
    event.target.value = ""
  }
  
  // Store the data temporarily
  const [importData, setImportData] = useState<ImportDataType | null>(null)
  
  // Handle the import confirmation
  const handleImport = () => {
    if (!importData) return
    
    try {
      let success = false
      
      if (importData.type === 'json') {
        // Use the context's restore method for JSON
        success = restoreData(importData.content)
      } else if (importData.type === 'csv') {
        // Process CSV data
        const lines = importData.content.split('\n')
        const dataLines = lines.filter((line: string) => !line.startsWith('#') && line.trim() !== '')
        
        if (dataLines.length < 2) {
          throw new Error("CSV file has no data rows")
        }
        
        // Parse header and data rows
        const headers = dataLines[0].split(',')
        const dateIndex = headers.findIndex((h: string) => h.toLowerCase().includes('date'))
        const caloriesInIndex = headers.findIndex((h: string) => h.toLowerCase().includes('calories in'))
        const caloriesOutIndex = headers.findIndex((h: string) => h.toLowerCase().includes('calories out'))
        const weightIndex = headers.findIndex((h: string) => h.toLowerCase().includes('weight'))
        
        if (dateIndex === -1 || caloriesInIndex === -1 || caloriesOutIndex === -1) {
          throw new Error("CSV file is missing required columns")
        }
        
        // Process data rows
        const entries: Entry[] = []
        for (const row of dataLines.slice(1)) {
          const values = row.split(',')
          
          if (values.length >= Math.max(dateIndex, caloriesInIndex, caloriesOutIndex) + 1) {
            const entry: Entry = {
              date: values[dateIndex].trim(),
              caloriesIn: parseInt(values[caloriesInIndex].trim(), 10) || 0,
              caloriesOut: parseInt(values[caloriesOutIndex].trim(), 10) || 0
            }
            
            // Add weight if available
            if (weightIndex !== -1 && values[weightIndex]?.trim()) {
              entry.weight = parseFloat(values[weightIndex].trim())
            }
            
            entries.push(entry)
          }
        }
        
        // Create a backup object and restore it
        const backupObject = {
          entries,
          timestamp: new Date().toISOString()
        }
        
        success = restoreData(JSON.stringify(backupObject))
      }
      
      if (success) {
        toast({
          title: "Import Successful",
          description: `Imported ${importData.entries} entries.`,
        })
      } else {
        toast({
          title: "Import Failed",
          description: "There was an error importing the data.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "There was an error processing the file.",
        variant: "destructive"
      })
    }
    
    setIsDialogOpen(false)
  }
  
  return (
    <>
      <input
        type="file"
        accept=".json,.csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
        ref={fileInputRef}
      />
      
      <Button 
        onClick={handleClick}
        className="w-full flex items-center gap-2"
        variant="outline"
      >
        <Upload size={16} />
        Import Data
      </Button>
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will merge the imported data with your existing data. 
              {importData?.type === 'csv' && 
                " CSV imports will create new entries or update existing ones with the same date."}
              {importData?.type === 'json' && 
                " JSON imports will restore your data from a previous backup."}
              <br/><br/>
              Ready to import {importData?.entries} entries?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 