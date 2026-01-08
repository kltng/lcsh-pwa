"use client";

import { useState } from "react";
import { useAppStore, type Conversation } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Eye, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function HistoryPage() {
  const { conversations, deleteConversation, clearHistory } = useAppStore();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  function handleView(conversation: Conversation) {
    setSelectedConversation(conversation);
    setIsDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteConversation(id);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Conversation History</h1>
          <p className="text-muted-foreground mt-2">
            Review your past LCSH recommendation sessions
          </p>
        </div>
        {conversations.length > 0 && (
          <Button variant="destructive" onClick={() => {
            if (confirm("Are you sure you want to clear all history?")) {
              clearHistory();
            }
          }}>
            Clear All
          </Button>
        )}
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No conversation history yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start a new session to see your history here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Recommendations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(conversation.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(conversation.timestamp).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {conversation.bibliographicInfo.title || "Untitled"}
                    </TableCell>
                    <TableCell>
                      {conversation.bibliographicInfo.author || "N/A"}
                    </TableCell>
                    <TableCell>
                      {conversation.finalRecommendations?.length || 0} terms
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(conversation)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(conversation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conversation Details</DialogTitle>
            <DialogDescription>
              {selectedConversation &&
                new Date(selectedConversation.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedConversation && (
            <div className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bibliographic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Title:</strong> {selectedConversation.bibliographicInfo.title || "N/A"}
                  </div>
                  <div>
                    <strong>Author:</strong> {selectedConversation.bibliographicInfo.author || "N/A"}
                  </div>
                  {selectedConversation.bibliographicInfo.abstract && (
                    <div>
                      <strong>Abstract:</strong>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedConversation.bibliographicInfo.abstract}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedConversation.initialSuggestions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Initial Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>
                        {selectedConversation.initialSuggestions.rawResponse}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedConversation.finalRecommendations && (
                <Card>
                  <CardHeader>
                    <CardTitle>Final Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedConversation.finalRecommendations.map((rec, idx) => (
                        <div key={idx} className="border-l-4 border-primary pl-4">
                          <div className="font-semibold">{rec.term}</div>
                          {rec.bestMatch && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Best Match: {rec.bestMatch.heading} (Similarity: {rec.similarity}%)
                            </div>
                          )}
                          {rec.marc && (
                            <div className="mt-2">
                              <strong>MARC:</strong>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                {rec.marc}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


