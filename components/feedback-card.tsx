"use client";

import { Button } from "@/archive/components/ui/button";
import { Card, CardContent, CardHeader } from "@/archive/components/ui/card";
import { Textarea } from "@/archive/components/ui/textarea";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface FeedbackCardProps {
  requestId: string | null;
}

export function FeedbackCard({ requestId }: FeedbackCardProps) {
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<
    "positive" | "negative" | null
  >(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Reset feedback state when requestId changes
  useEffect(() => {
    if (!requestId) {
      setFeedbackId(null);
      setShowFeedback(false);
      setFeedbackType(null);
      setFeedbackText("");
      setIsSubmittingFeedback(false);
      setFeedbackSubmitted(false);
    }
  }, [requestId]);

  const saveFeedback = useCallback(
    async (type: "positive" | "negative", additionalText: string = "") => {
      if (!requestId) return;

      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId: requestId,
            feedbackId: feedbackId || undefined,
            isPositive: type === "positive",
            feedback: additionalText.trim() || undefined,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to submit feedback");
        }

        // If this was a new feedback creation, store the feedback ID
        if (!feedbackId && data.data?.id) {
          setFeedbackId(data.data.id);
        }
      } catch (error) {
        console.error("Error saving feedback:", error);
      }
    },
    [requestId, feedbackId]
  );

  // Auto-save feedback text after 3 seconds of inactivity
  useEffect(() => {
    if (
      !feedbackText.trim() ||
      !feedbackType ||
      !requestId ||
      feedbackSubmitted
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      saveFeedback(feedbackType, feedbackText);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [feedbackText, feedbackType, requestId, feedbackSubmitted, saveFeedback]);

  function handleFeedback(type: "positive" | "negative") {
    // If clicking the same type, just show/hide the feedback form
    if (feedbackType === type) {
      setShowFeedback(!showFeedback);
      return;
    }

    // If switching types or first selection, update and save
    setFeedbackType(type);
    setFeedbackText("");
    setShowFeedback(true);
    setFeedbackSubmitted(false);

    // Save the new feedback type
    if (requestId) {
      saveFeedback(type, "");
    }
  }

  async function submitFeedback() {
    if (!requestId || feedbackType === null) return;

    setIsSubmittingFeedback(true);

    try {
      // Update the existing feedback with additional text
      await saveFeedback(feedbackType, feedbackText);

      setFeedbackSubmitted(true);
      setTimeout(() => {
        setShowFeedback(false);
      }, 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      // You could add error state here if needed
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  // Don't render anything if no requestId
  if (!requestId) {
    return null;
  }

  return (
    <div className="space-y-6">
      {!feedbackSubmitted && (
        <div className="flex justify-center space-x-4">
          <Button
            variant={feedbackType === "positive" ? "default" : "outline"}
            onClick={() => handleFeedback("positive")}
            className={`flex items-center gap-2 ${
              feedbackType === "positive"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "hover:bg-green-50 hover:text-green-700 hover:border-green-300"
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            Like
          </Button>
          <Button
            variant={feedbackType === "negative" ? "default" : "outline"}
            onClick={() => handleFeedback("negative")}
            className={`flex items-center gap-2 ${
              feedbackType === "negative"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            }`}
          >
            <ThumbsDown className="h-4 w-4" />
            Dislike
          </Button>
        </div>
      )}

      {feedbackSubmitted && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-4 w-4" />
            <span>Thank you for your feedback!</span>
          </div>
        </div>
      )}

      {showFeedback && !feedbackSubmitted && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">
              {feedbackType === "positive"
                ? "What did you like?"
                : "What could be improved?"}
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Your feedback (optional, max 500 characters)"
                className="min-h-[100px]"
                maxLength={500}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedback(false)}
                  disabled={isSubmittingFeedback}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitFeedback}
                  disabled={isSubmittingFeedback}
                >
                  {isSubmittingFeedback ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
