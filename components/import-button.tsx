"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useWeightTracker } from "@/components/weight-tracker-context"
import { Upload } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"

export function ImportButton() {
  const { toast } = useToast()
  const { setGoal, addEntry, setWeightUnit } = useWeightTracker()
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
        const data = JSON.parse(e.target?.result as string)
        
        // Validate the data structure
        if (!data.entries || !Array.isArray(data.entries)) {
          throw new Error("Invalid data format: Missing or invalid entries")
        }
        
        // Store the data temporarily and open confirmation dialog
        setImportData(data)
        setIsDialogOpen(true)
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "The selected file contains invalid data.",
          variant: "destructive"
        })
      }
    }
    
    reader.readAsText(file)
    
    // Reset the file input
    event.target.value = ""
  }
  
  // Store the data temporarily
  const [importData, setImportData] = useState<any>(null)
  
  // Handle the import confirmation
  const handleImport = () => {
    if (!importData) return
    
    try {
      // Update the app state with imported data
      if (importData.entries && Array.isArray(importData.entries)) {
        // For each entry in the imported data
        importData.entries.forEach((entry: any) => {
          // Add the entry - this will handle duplicates
          addEntry({
            date: entry.date,
            caloriesIn: Number(entry.caloriesIn),
            caloriesOut: Number(entry.caloriesOut),
            weight: entry.weight ? Number(entry.weight) : undefined
          })
        })
      }
      
      if (importData.goal) {
        setGoal(importData.goal)
      }
      
      if (importData.weightUnit) {
        setWeightUnit(importData.weightUnit)
      }
      
      toast({
        title: "Import Successful",
        description: `Imported ${importData.entries.length} entries.`,
      })
      
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "There was an error importing the data.",
        variant: "destructive"
      })
    }
    
    setIsDialogOpen(false)
  }
  
  return (
    <>
      <input
        type="file"
        accept=".json"
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
              If there are entries with the same date, they will be updated.
              Do you want to proceed?
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