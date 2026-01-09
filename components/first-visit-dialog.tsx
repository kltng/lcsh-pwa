"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const FIRST_VISIT_KEY = "lcsh-pwa-first-visit-acknowledged"

export function FirstVisitDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Check if user has already acknowledged the first visit message
    const hasAcknowledged = localStorage.getItem(FIRST_VISIT_KEY)
    if (!hasAcknowledged) {
      setOpen(true)
    }
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem(FIRST_VISIT_KEY, "true")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Cataloging Assistant</DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>
              This is a{" "}
              <a
                href="https://en.wikipedia.org/wiki/Progressive_web_app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Progressive Web Application (PWA)
              </a>
              . All information is stored locally on your device.
            </p>
            <p>
              This is an experimental project. Frequent updates and changes may
              occur without prior notice.
            </p>
            <p className="font-medium text-foreground">
              Please use at your own risk.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleAcknowledge} className="w-full sm:w-auto">
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
