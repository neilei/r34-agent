"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import JSONPretty from "react-json-pretty";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { FeedbackCard } from "@/components/feedback-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { config } from "@/lib/config";
import { ChevronDown, ChevronRight, Rocket } from "lucide-react";
import { useSession } from "../components/session-provider";

const formSchema = z.object({
  text: z.string().max(750, {
    message: "Text must not exceed 750 characters.",
  }),
  kinks: z.string().optional(),
  model: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showDevData, setShowDevData] = useState(false);
  const [rawApiResponse, setRawApiResponse] = useState<object | null>(null);
  const { sessionId } = useSession();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      text: "",
      kinks: "",
      model: "venice-uncensored",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResponse(null);
    setRequestId(null);
    setRawApiResponse(null);

    try {
      const kinks = values.kinks
        ? values.kinks.split(",").map((kink) => kink.trim())
        : [];

      // Generate a request ID on the frontend
      const generatedRequestId = uuidv4();

      const response = await fetch(`${config.backendUrl}/rule34-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalText: values.text,
          kinks: kinks,
          sessionId: sessionId,
          requestId: generatedRequestId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to process request");
      }

      // Store raw response for development mode
      setRawApiResponse(data.result);

      // Display the rewritten text instead of raw response
      let displayText = data.result.rewrittenText;

      // If rewrittenText is not available, try to parse it from veniceResponse
      if (!displayText && data.result.veniceResponse) {
        try {
          const parsed = JSON.parse(data.result.veniceResponse);
          displayText = parsed.rewritten_text;
        } catch (error) {
          console.error("Failed to parse veniceResponse JSON:", error);
          displayText = data.result.veniceResponse;
        }
      }

      setResponse(displayText || "No response generated");
      setRequestId(data.result.requestId);
    } catch (error) {
      console.error("Error:", error);
      setResponse(
        "An error occurred while processing your request. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your text</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="Enter your text here (max 750 characters)"
                        className="min-h-[150px] resize-y pr-16"
                        {...field}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background bg-opacity-80 px-1 rounded">
                        {field.value.length} / 750
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="link"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-0 h-8 flex items-center gap-1 -ml-3"
            >
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {showAdvanced ? "Hide Advanced" : "Advanced"}
            </Button>

            {showAdvanced && (
              <div className="space-y-6 pt-1 mt-0">
                <FormField
                  control={form.control}
                  name="kinks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kinks</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter kinks separated by commas"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter kinks separated by commas (e.g., kink1, kink2,
                        kink3). Will be inferred from the text if not provided.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="venice-uncensored">
                            venice-uncensored
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the model to use for text generation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              <Rocket className="mr-2 h-4 w-4" /> Submit
            </Button>
          </form>
        </Form>

        {isLoading && (
          <Card className="p-4">
            <CardHeader>
              <h3 className="text-lg font-medium">
                Processing your request...
              </h3>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col items-center justify-center gap-2">
              <Progress value={33} className="w-full" />
            </CardContent>
          </Card>
        )}

        {response && !isLoading && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Result</h3>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap">{response}</div>
              </CardContent>
            </Card>

            {process.env.NODE_ENV === "development" && rawApiResponse && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Debug</h3>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => setShowDevData(!showDevData)}
                    className="flex items-center gap-2"
                  >
                    {showDevData ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {showDevData ? "Hide" : "Show"} Raw API Response
                  </Button>
                  {showDevData && (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg overflow-auto max-h-96">
                      <JSONPretty data={rawApiResponse} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <FeedbackCard requestId={requestId} />
          </div>
        )}
      </div>

      <footer className="mt-16 pt-6 border-t text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Neilei. All rights reserved.</p>
      </footer>
    </div>
  );
}
