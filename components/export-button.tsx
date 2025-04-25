"use client"

import { Button } from "@/components/ui/button"
import { useWeightTracker } from "@/components/weight-tracker-context"
import { Download } from "lucide-react"

export function ExportButton() {
  const { entries, goal, weightUnit } = useWeightTracker()

  const handleExport = () => {
    // Create a data object with all user information
    const exportData = {
      entries,
      goal,
      weightUnit,
      exportDate: new Date().toISOString()
    }

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2)
    
    // Create a blob with the data
    const blob = new Blob([jsonString], { type: "application/json" })
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob)
    
    // Create a temporary link element
    const link = document.createElement("a")
    link.href = url
    
    // Set the download filename with current date
    const date = new Date().toISOString().split("T")[0]
    link.download = `fat-loss-data-${date}.json`
    
    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Release the URL object
    URL.revokeObjectURL(url)
  }

  return (
    <Button 
      onClick={handleExport} 
      className="w-full flex items-center gap-2"
      variant="outline"
    >
      <Download size={16} />
      Export Data
    </Button>
  )
} 