"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { BibliographicForm } from "@/components/wizard/bibliographic-form";
import { ValidatedSuggestions, type ValidatedTerm } from "@/components/wizard/validated-suggestions";
import { FinalRecommendations } from "@/components/wizard/final-recommendations";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";

const steps = [
  { id: 0, name: "Bibliographic Information" },
  { id: 1, name: "Validated Suggestions" },
  { id: 2, name: "Final Recommendations" },
];

export default function WizardPage() {
  const { activeStep, setActiveStep, setSubjectAnalysis: setStoreSubjectAnalysis } = useAppStore();
  const [validatedTerms, setValidatedTerms] = useState<ValidatedTerm[]>([]);
  const [subjectAnalysis, setSubjectAnalysis] = useState<string>("");

  const progress = ((activeStep + 1) / steps.length) * 100;

  function renderStep() {
    switch (activeStep) {
      case 0:
        return (
          <BibliographicForm
            onValidatedTerms={(terms, analysis) => {
              setValidatedTerms(terms);
              setSubjectAnalysis(analysis || "");
              setStoreSubjectAnalysis(analysis || "");
            }}
          />
        );
      case 1:
        return (
          <ValidatedSuggestions
            validatedTerms={validatedTerms}
            subjectAnalysis={subjectAnalysis}
            onContinue={() => setActiveStep(2)}
            onBack={() => setActiveStep(0)}
          />
        );
      case 2:
        return <FinalRecommendations />;
      default:
        return (
          <BibliographicForm
            onValidatedTerms={(terms, analysis) => {
              setValidatedTerms(terms);
              setSubjectAnalysis(analysis || "");
              setStoreSubjectAnalysis(analysis || "");
            }}
          />
        );
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cataloging Assistant</h1>
        <p className="text-muted-foreground">
          Generate and validate Library of Congress Subject Headings using AI
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${index <= activeStep
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-muted-foreground"
                      }`}
                  >
                    {index < activeStep ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center ${index === activeStep
                        ? "font-semibold"
                        : "text-muted-foreground"
                      }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${index < activeStep ? "bg-primary" : "bg-muted"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>
    </div>
  );
}
