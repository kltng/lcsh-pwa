import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Settings, History, Sparkles, FileSpreadsheet } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container mx-auto py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Cataloging Assistant</h1>
        <p className="text-xl text-muted-foreground">
          Generate and validate Library of Congress Subject Headings using AI
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Sparkles className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Start New Session</CardTitle>
            <CardDescription>
              Generate LCSH recommendations for a new work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/wizard">
              <Button className="w-full">Start Wizard</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileSpreadsheet className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Batch Processing</CardTitle>
            <CardDescription>
              Upload a CSV to process multiple works at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/batch">
              <Button variant="outline" className="w-full">Start Batch</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <History className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>View History</CardTitle>
            <CardDescription>
              Review your past recommendation sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/history">
              <Button variant="outline" className="w-full">View History</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Settings className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Configure your AI model provider and model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button variant="outline" className="w-full">Open Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
