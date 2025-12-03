"use client"

import { useState, useRef } from "react"
import { Upload, FileJson, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"

interface JsonImportDialogProps {
    pipelineId: string
    onImportSuccess?: () => void
    trigger?: React.ReactNode
}

export default function JsonImportDialog({ pipelineId, onImportSuccess, trigger }: JsonImportDialogProps) {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
                toast.error("Invalid file type", "Please select a JSON file")
                return
            }
            setFile(selectedFile)
        }
    }

    const handleImport = async () => {
        if (!file) {
            toast.error("No file selected", "Please select a JSON file to import")
            return
        }

        setImporting(true)
        try {
            const result = await apiService.importJsonMapping(pipelineId, file)
            if (result.data) {
                toast.success("JSON imported successfully", "Pipeline step created from JSON file")
                setOpen(false)
                setFile(null)
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
                onImportSuccess?.()
            } else if (result.error) {
                toast.error("Failed to import JSON", result.error)
            }
        } catch (error) {
            toast.error("Failed to import JSON", error instanceof Error ? error.message : "Unknown error")
        } finally {
            setImporting(false)
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile) {
            if (droppedFile.type !== 'application/json' && !droppedFile.name.endsWith('.json')) {
                toast.error("Invalid file type", "Please select a JSON file")
                return
            }
            setFile(droppedFile)
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Import JSON
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import JSON Mapping</DialogTitle>
                    <DialogDescription>
                        Upload a JSON file to create a pipeline step. The file should contain table mapping configuration.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="json-file-input"
                        />
                        {file ? (
                            <div className="space-y-2">
                                <FileJson className="h-12 w-12 mx-auto text-primary" />
                                <p className="font-medium">{file.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {(file.size / 1024).toFixed(2)} KB
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setFile(null)
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = ''
                                        }
                                    }}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Remove
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                                <div>
                                    <label htmlFor="json-file-input">
                                        <Button variant="outline" asChild>
                                            <span>Select JSON File</span>
                                        </Button>
                                    </label>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        or drag and drop a JSON file here
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
                            Cancel
                        </Button>
                        <Button onClick={handleImport} disabled={!file || importing}>
                            {importing ? "Importing..." : "Import"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

