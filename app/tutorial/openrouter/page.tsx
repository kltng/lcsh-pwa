import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section, Screenshot } from "@/components/tutorial-helpers";

export const metadata = {
  title: "OpenRouter Guide - Cataloging Assistant",
  description:
    "How to use OpenRouter with the LCSH Cataloging Assistant — free models, API keys, and configuration.",
};

export default function OpenRouterTutorialPage() {
  return (
    <div className="container mx-auto py-12 max-w-4xl px-4">
      <div className="text-center mb-12">
        <Badge variant="secondary" className="mb-4">
          Provider Guide
        </Badge>
        <h1 className="text-4xl font-bold mb-4">Using OpenRouter</h1>
        <p className="text-xl text-muted-foreground">
          Access 400+ AI models through a single API — including free models with
          no credit card required
        </p>
      </div>

      {/* Table of Contents */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>In This Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 list-decimal list-inside text-sm">
            <li>
              <a href="#what-is-openrouter" className="text-primary hover:underline">
                What is OpenRouter?
              </a>
            </li>
            <li>
              <a href="#create-account" className="text-primary hover:underline">
                Create an Account
              </a>
            </li>
            <li>
              <a href="#get-api-key" className="text-primary hover:underline">
                Get Your API Key
              </a>
            </li>
            <li>
              <a href="#find-free-models" className="text-primary hover:underline">
                Find Free Models
              </a>
            </li>
            <li>
              <a href="#configure-pwa" className="text-primary hover:underline">
                Configure the LCSH PWA
              </a>
            </li>
            <li>
              <a href="#free-model-ids" className="text-primary hover:underline">
                Using Free Model IDs
              </a>
            </li>
            <li>
              <a href="#rate-limits" className="text-primary hover:underline">
                Rate Limits & Tips
              </a>
            </li>
          </ol>
        </CardContent>
      </Card>

      <div className="space-y-16">
        {/* Section 1 */}
        <Section id="what-is-openrouter" title="1. What is OpenRouter?">
          <p className="text-muted-foreground mb-4">
            <a
              href="https://openrouter.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              OpenRouter
            </a>{" "}
            is an AI model aggregator that provides access to 400+ models from
            providers like Meta, Google, Mistral, and others through a single,
            unified API. It is one of the easiest ways to get started with the
            Cataloging Assistant because:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
            <li>
              <strong>Free tier available</strong> — Several high-quality models
              are available at no cost
            </li>
            <li>
              <strong>No credit card required</strong> — Sign up and start using
              free models immediately
            </li>
            <li>
              <strong>Single API key</strong> — One key gives you access to all
              available models
            </li>
            <li>
              <strong>Pay-as-you-go</strong> — When you&apos;re ready, add credits
              for access to premium models
            </li>
          </ul>
          <Screenshot
            src="/screenshots/openrouter/homepage.png"
            alt="OpenRouter homepage"
          />
        </Section>

        {/* Section 2 */}
        <Section id="create-account" title="2. Create an Account">
          <p className="text-muted-foreground mb-4">
            Creating an OpenRouter account is quick and free:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground mb-4">
            <li>
              Visit{" "}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                openrouter.ai
              </a>
            </li>
            <li>
              Click <strong>&quot;Sign In&quot;</strong> in the top-right corner
            </li>
            <li>
              Choose your sign-in method: <strong>Google</strong>,{" "}
              <strong>GitHub</strong>, or <strong>email</strong>
            </li>
            <li>Complete the sign-up process and verify your email if prompted</li>
          </ol>
          <Screenshot
            src="/screenshots/openrouter/sign-in.png"
            alt="OpenRouter sign-in page with Google and GitHub options"
          />
        </Section>

        {/* Section 3 */}
        <Section id="get-api-key" title="3. Get Your API Key">
          <p className="text-muted-foreground mb-4">
            Once signed in, generate an API key:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground mb-4">
            <li>
              Click your avatar in the top-right corner and go to{" "}
              <strong>Settings</strong>
            </li>
            <li>
              Navigate to the{" "}
              <a
                href="https://openrouter.ai/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                API Keys
              </a>{" "}
              section
            </li>
            <li>
              Click <strong>&quot;Create Key&quot;</strong>
            </li>
            <li>Give your key a name (e.g., &quot;LCSH Cataloging&quot;)</li>
            <li>
              <strong>Copy the key immediately</strong> — it will only be shown
              once
            </li>
          </ol>
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <CardContent className="pt-6">
              <p className="text-sm">
                <strong>Important:</strong> Your API key starts with{" "}
                <code className="bg-muted px-1 rounded">sk-or-v1-</code>. Copy and
                save it somewhere safe — you won&apos;t be able to see it again
                after leaving the page.
              </p>
            </CardContent>
          </Card>
        </Section>

        {/* Section 4 */}
        <Section id="find-free-models" title="4. Find Free Models">
          <p className="text-muted-foreground mb-4">
            OpenRouter offers several free models that work well for LCSH
            cataloging:
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">Model</th>
                  <th className="py-2 pr-4 text-left font-semibold">Model ID</th>
                  <th className="py-2 text-left font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4 font-medium">DeepSeek R1 (free)</td>
                  <td className="py-2 pr-4">
                    <code className="bg-muted px-1 rounded text-xs">
                      deepseek/deepseek-r1:free
                    </code>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    Strong reasoning, good for subject analysis
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Gemini 2.0 Flash (free)</td>
                  <td className="py-2 pr-4">
                    <code className="bg-muted px-1 rounded text-xs">
                      google/gemini-2.0-flash-exp:free
                    </code>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    Fast, supports vision (book cover analysis)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Llama 3.3 70B (free)</td>
                  <td className="py-2 pr-4">
                    <code className="bg-muted px-1 rounded text-xs">
                      meta-llama/llama-3.3-70b-instruct:free
                    </code>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    General-purpose, reliable for cataloging
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mb-4">
            To browse all free models, visit the{" "}
            <a
              href="https://openrouter.ai/models?q=free"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              OpenRouter models page
            </a>{" "}
            and filter by &quot;free&quot;.
          </p>
          <Screenshot
            src="/screenshots/openrouter/free-models.png"
            alt="OpenRouter models page filtered to show free models"
          />
        </Section>

        {/* Section 5 */}
        <Section id="configure-pwa" title="5. Configure the LCSH PWA">
          <p className="text-muted-foreground mb-4">
            With your API key ready, configure the Cataloging Assistant:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground mb-4">
            <li>
              Go to{" "}
              <a href="/settings" className="text-primary hover:underline">
                Settings
              </a>{" "}
              in the Cataloging Assistant
            </li>
            <li>
              Under <strong>Cloud Providers</strong>, select{" "}
              <strong>OpenRouter</strong> from the Provider dropdown
            </li>
            <li>
              The model list will load automatically — use the search box to find
              your preferred model
            </li>
            <li>
              Scroll down to <strong>API Keys</strong> and paste your OpenRouter API
              key
            </li>
            <li>
              Click <strong>Test Connection</strong> to verify everything works
            </li>
          </ol>
          <Screenshot
            src="/screenshots/openrouter/pwa-settings.png"
            alt="LCSH PWA settings page configured with OpenRouter"
          />
        </Section>

        {/* Section 6 */}
        <Section id="free-model-ids" title="6. Using Free Model IDs">
          <p className="text-muted-foreground mb-4">
            OpenRouter uses a naming convention for free model variants:
          </p>
          <Card className="mb-4">
            <CardContent className="pt-6">
              <p className="text-sm mb-3">
                Free models have the <code className="bg-muted px-1 rounded">:free</code>{" "}
                suffix appended to their model ID. For example:
              </p>
              <ul className="space-y-2 text-sm font-mono">
                <li>
                  <code className="bg-muted px-2 py-1 rounded">
                    meta-llama/llama-3.3-70b-instruct:free
                  </code>
                </li>
                <li>
                  <code className="bg-muted px-2 py-1 rounded">
                    deepseek/deepseek-r1:free
                  </code>
                </li>
                <li>
                  <code className="bg-muted px-2 py-1 rounded">
                    google/gemini-2.0-flash-exp:free
                  </code>
                </li>
              </ul>
            </CardContent>
          </Card>
          <p className="text-muted-foreground">
            When you select a model from the model picker in the PWA, it will
            automatically include the correct model ID. If entering a model ID
            manually, make sure to include the <code className="bg-muted px-1 rounded">:free</code>{" "}
            suffix to use the free version.
          </p>
        </Section>

        {/* Section 7 */}
        <Section id="rate-limits" title="7. Rate Limits & Tips">
          <p className="text-muted-foreground mb-4">
            Keep these limits and tips in mind when using OpenRouter:
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">Tier</th>
                  <th className="py-2 pr-4 text-left font-semibold">
                    Rate Limit
                  </th>
                  <th className="py-2 text-left font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4 font-medium">Free (no credits)</td>
                  <td className="py-2 pr-4">~50 requests/day on free models</td>
                  <td className="py-2 text-muted-foreground">$0</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">With credits ($10+)</td>
                  <td className="py-2 pr-4">~1000 requests/day</td>
                  <td className="py-2 text-muted-foreground">Pay-as-you-go</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mb-3">Tips for Best Results</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Start with DeepSeek R1 (free)</strong> — it has strong
              reasoning capabilities that work well for subject analysis and LCSH
              selection
            </li>
            <li>
              <strong>Use Gemini 2.0 Flash (free) for images</strong> — if you need
              to analyze book covers or title pages, this model supports vision
            </li>
            <li>
              <strong>Monitor your usage</strong> — check your usage on the{" "}
              <a
                href="https://openrouter.ai/activity"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Activity page
              </a>
            </li>
            <li>
              <strong>Add credits for higher limits</strong> — even $5 in credits
              significantly increases your rate limits and unlocks paid models
            </li>
            <li>
              <strong>Try different models</strong> — different models may perform
              better for different types of materials (fiction vs. non-fiction,
              technical vs. humanities)
            </li>
          </ul>
        </Section>
      </div>

      {/* Back link */}
      <div className="mt-16 pt-8 border-t text-center">
        <p className="text-muted-foreground">
          For a complete walkthrough of all features, see the{" "}
          <a href="/tutorial" className="text-primary hover:underline font-medium">
            Complete Tutorial
          </a>
          .
        </p>
      </div>
    </div>
  );
}
