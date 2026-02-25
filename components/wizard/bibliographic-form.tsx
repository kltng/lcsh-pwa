"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, X } from "lucide-react";
import { generateSuggestionsClientSide } from "@/lib/ai-pipeline";
import type { ValidatedTerm } from "@/components/wizard/validated-suggestions";

interface BibliographicFormProps {
  onValidatedTerms: (terms: ValidatedTerm[], subjectAnalysis?: string) => void;
}

export function BibliographicForm({ onValidatedTerms }: BibliographicFormProps) {
  const {
    bibliographicInfo,
    setBibliographicInfo,
    systemPromptRules,
    apiKey,
    apiKeys,
    modelId,
    provider, // Get provider from store to pass to API
    getApiKeyForProvider,
    setActiveStep,
    setIsLoading,
    isLoading,
    error,
    setError,
  } = useAppStore();

  const [uploadedImages, setUploadedImages] = useState<
    Array<{
      file: File;
      preview: string;
      name: string;
      type: string;
      size: number;
    }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setBibliographicInfo({
      ...bibliographicInfo,
      [name]: value,
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);

    const imageFiles = files.filter(
      (file) =>
        file.type === "image/png" ||
        file.type === "image/jpeg" ||
        file.type === "image/jpg"
    );

    if (imageFiles.length !== files.length) {
      setError("Only PNG and JPEG images are allowed");
      return;
    }

    const newImages = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
    }));

    setUploadedImages([...uploadedImages, ...newImages]);
    e.target.value = "";
  }

  function handleDeleteImage(index: number) {
    const newImages = [...uploadedImages];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setUploadedImages(newImages);
  }

  async function convertImagesToBase64() {
    return Promise.all(
      uploadedImages.map(
        (image) =>
          new Promise<{ data: string; name: string; type: string }>(
            (resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  data: reader.result as string,
                  name: image.name,
                  type: image.type,
                });
              reader.onerror = reject;
              reader.readAsDataURL(image.file);
            }
          )
      )
    );
  }

  function validateForm() {
    if (!bibliographicInfo.title?.trim() && uploadedImages.length === 0) {
      setError("Please provide a title or upload at least one image");
      return false;
    }

    if (!modelId) {
      setError("Please configure your AI model in Settings");
      return false;
    }

    if (!provider) {
      setError("Please select a provider in Settings");
      return false;
    }

    // Check for API key (either from apiKeys array or deprecated apiKey)
    const hasApiKey = getApiKeyForProvider(provider) || apiKey;
    if (!hasApiKey) {
      setError("Please add an API key for this provider in Settings");
      return false;
    }

    setError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      let imageData: Array<{ data: string; name: string; type: string }> = [];
      if (uploadedImages.length > 0) {
        imageData = await convertImagesToBase64();
      }

      const enhancedBibliographicInfo = {
        ...bibliographicInfo,
        images: imageData,
      };

      // Run AI + LOC validation entirely client-side (zero-knowledge)
      const effectiveApiKey = getApiKeyForProvider(provider!) || apiKey;
      if (!effectiveApiKey) {
        throw new Error("No API key found for this provider");
      }

      const data = await generateSuggestionsClientSide({
        modelId: modelId!,
        provider: provider!,
        apiKey: effectiveApiKey,
        bibliographicInfo: enhancedBibliographicInfo,
        systemPromptRules: systemPromptRules || "",
      });

      if (data.validatedTerms) {
        onValidatedTerms(data.validatedTerms, data.subjectAnalysis);
        setActiveStep(1);
      } else {
        throw new Error("No validated terms returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate LCSH suggestions");
      console.error("Error generating LCSH suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Enter Bibliographic Information</h2>
        <p className="text-muted-foreground">
          Provide details about the work you want to catalog
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            Title {uploadedImages.length === 0 && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="title"
            name="title"
            value={bibliographicInfo.title || ""}
            onChange={handleInputChange}
            placeholder="Enter the title of the work"
          />
          {uploadedImages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Required (or upload an image)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            name="author"
            value={bibliographicInfo.author || ""}
            onChange={handleInputChange}
            placeholder="Enter the author name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="abstract">Abstract</Label>
          <Textarea
            id="abstract"
            name="abstract"
            value={bibliographicInfo.abstract || ""}
            onChange={handleInputChange}
            rows={4}
            placeholder="A brief summary of the work"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tableOfContents">Table of Contents</Label>
          <Textarea
            id="tableOfContents"
            name="tableOfContents"
            value={bibliographicInfo.tableOfContents || ""}
            onChange={handleInputChange}
            rows={4}
            placeholder="List of chapters or sections"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            value={bibliographicInfo.notes || ""}
            onChange={handleInputChange}
            rows={4}
            placeholder="Any other relevant information"
          />
        </div>

        <div className="space-y-2">
          <Label>Upload Images (PNG, JPEG)</Label>
          <p className="text-sm text-muted-foreground">
            You can upload images of book covers, title pages, or other bibliographic materials.
          </p>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Images
          </Button>
        </div>

        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedImages.map((image, index) => (
              <Card key={index}>
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-40 object-contain bg-muted"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => handleDeleteImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{image.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(image.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Suggestions...
            </>
          ) : (
            "Generate LCSH Suggestions"
          )}
        </Button>
      </div>
    </form>
  );
}
