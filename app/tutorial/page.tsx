import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section, Screenshot } from "@/components/tutorial-helpers";

export const metadata = {
  title: "Tutorial - Cataloging Assistant",
  description:
    "Complete tutorial guide for the LCSH Cataloging Assistant — settings, wizard walkthrough, MARC records, and more.",
};

export default function TutorialPage() {
  return (
    <div className="container mx-auto py-12 max-w-4xl px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Complete Tutorial Guide</h1>
        <p className="text-xl text-muted-foreground">
          A step-by-step walkthrough of every feature in the Cataloging
          Assistant
        </p>
      </div>

      {/* Table of Contents */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>Table of Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            <li>
              <a
                href="#getting-started"
                className="text-primary hover:underline"
              >
                Getting Started
              </a>
            </li>
            <li>
              <a
                href="#configuring-settings"
                className="text-primary hover:underline"
              >
                Configuring Settings
              </a>
            </li>
            <li>
              <a
                href="#using-the-wizard"
                className="text-primary hover:underline"
              >
                Using the Wizard: Complete Walkthrough
              </a>
            </li>
            <li>
              <a
                href="#managing-history"
                className="text-primary hover:underline"
              >
                Managing Conversation History
              </a>
            </li>
            <li>
              <a
                href="#validation-scores"
                className="text-primary hover:underline"
              >
                Understanding Validation Scores
              </a>
            </li>
            <li>
              <a href="#marc-records" className="text-primary hover:underline">
                Working with MARC Records
              </a>
            </li>
            <li>
              <a href="#tips" className="text-primary hover:underline">
                Tips &amp; Best Practices
              </a>
            </li>
            <li>
              <a
                href="#troubleshooting"
                className="text-primary hover:underline"
              >
                Troubleshooting
              </a>
            </li>
          </ol>
        </CardContent>
      </Card>

      <div className="space-y-16">
        {/* 1. Getting Started */}
        <Section id="getting-started" title="1. Getting Started">
          <h3 className="text-lg font-semibold mt-6 mb-3">Accessing the App</h3>
          <p className="text-muted-foreground mb-4">
            Open your web browser and navigate to{" "}
            <a
              href="https://assistant.cataloguer.name"
              className="text-primary underline"
            >
              assistant.cataloguer.name
            </a>
            . The app works best in modern browsers (Chrome, Firefox, Safari,
            Edge).
          </p>

          <h3 className="text-lg font-semibold mt-8 mb-3">First Visit</h3>
          <p className="text-muted-foreground mb-2">
            When you open the app for the first time, you&apos;ll see a welcome
            dialog:
          </p>
          <Screenshot
            src="/screenshots/00-welcome-dialog.png"
            alt="Welcome dialog"
          />
          <p className="text-muted-foreground mb-2">
            This dialog tells you three important things:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground mb-4">
            <li>
              <strong className="text-foreground">This is a PWA</strong> — All
              information is stored locally on your device
            </li>
            <li>
              <strong className="text-foreground">It&apos;s experimental</strong>{" "}
              — Frequent updates and changes may occur without notice
            </li>
            <li>
              <strong className="text-foreground">Use at your own risk</strong>{" "}
              — Always verify AI-generated headings against professional
              standards
            </li>
          </ol>
          <p className="text-muted-foreground mb-4">
            Click <strong className="text-foreground">&quot;I Understand&quot;</strong> to
            dismiss the dialog.
          </p>

          <h3 className="text-lg font-semibold mt-8 mb-3">Home Page</h3>
          <p className="text-muted-foreground mb-2">
            After dismissing the welcome dialog, you&apos;ll see the home page
            with three action cards:
          </p>
          <Screenshot src="/screenshots/01-home-page.png" alt="Home page" />

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">Card</th>
                  <th className="py-2 text-left font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4 font-medium">Start New Session</td>
                  <td className="py-2 text-muted-foreground">
                    Generate LCSH recommendations — opens the 3-step Wizard
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">View History</td>
                  <td className="py-2 text-muted-foreground">
                    Review your past recommendation sessions
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Settings</td>
                  <td className="py-2 text-muted-foreground">
                    Configure your AI model provider and model
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Installing the App (PWA)
          </h3>
          <p className="text-muted-foreground mb-4">
            The Cataloging Assistant is a Progressive Web App, which means you
            can install it on your device and use it like a native app — with
            its own window, icon, and faster loading.
          </p>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">
                Desktop: Chrome or Edge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Visit the app URL in Chrome or Edge</li>
                <li>
                  Look for the <strong className="text-foreground">install icon</strong> in the
                  address bar, or click the three-dot menu and select{" "}
                  <strong className="text-foreground">&quot;Install Cataloging Assistant&quot;</strong>
                </li>
                <li>
                  Click <strong className="text-foreground">&quot;Install&quot;</strong> in the
                  confirmation prompt
                </li>
                <li>
                  The app opens in its own window and appears in your app
                  launcher
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">
                Desktop: Safari (macOS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Visit the app URL in Safari</li>
                <li>
                  From the menu bar, click{" "}
                  <strong className="text-foreground">File &gt; Add to Dock</strong>
                </li>
                <li>
                  Confirm the name and click{" "}
                  <strong className="text-foreground">&quot;Add&quot;</strong>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">
                iPhone / iPad (iOS / iPadOS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                <li>
                  Open the URL in <strong className="text-foreground">Safari</strong> (does not
                  work in Chrome on iOS)
                </li>
                <li>
                  Tap the <strong className="text-foreground">Share button</strong> (square with
                  upward arrow)
                </li>
                <li>
                  Scroll down and tap{" "}
                  <strong className="text-foreground">&quot;Add to Home Screen&quot;</strong>
                </li>
                <li>
                  Edit the name if desired, then tap{" "}
                  <strong className="text-foreground">&quot;Add&quot;</strong>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Android (Chrome)</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                <li>
                  Open the URL in <strong className="text-foreground">Chrome</strong>
                </li>
                <li>
                  Tap the <strong className="text-foreground">three-dot menu</strong>
                </li>
                <li>
                  Tap{" "}
                  <strong className="text-foreground">
                    &quot;Add to Home screen&quot;
                  </strong>{" "}
                  or <strong className="text-foreground">&quot;Install app&quot;</strong>
                </li>
                <li>
                  Tap <strong className="text-foreground">&quot;Install&quot;</strong>
                </li>
              </ol>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> The installed PWA
            still uses your browser&apos;s engine under the hood. Your data is
            stored in the same local storage as the browser version, so
            switching between installed and browser modes accesses the same data.
          </div>
        </Section>

        {/* 2. Configuring Settings */}
        <Section id="configuring-settings" title="2. Configuring Settings">
          <p className="text-muted-foreground mb-4">
            <strong className="text-foreground">
              Before you can use the Wizard, you must configure an AI model
              provider.
            </strong>{" "}
            Navigate to Settings by clicking &quot;Open Settings&quot; on the home page
            or &quot;Settings&quot; in the navigation bar.
          </p>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Selecting a Provider
          </h3>
          <p className="text-muted-foreground mb-2">
            Click the <strong className="text-foreground">&quot;Provider&quot;</strong> dropdown to
            see available cloud AI providers:
          </p>
          <Screenshot
            src="/screenshots/03-settings-provider-dropdown.png"
            alt="Provider dropdown"
          />

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Adding Your API Key
          </h3>
          <p className="text-muted-foreground mb-2">
            After selecting a provider:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground mb-4">
            <li>
              Enter your API key in the{" "}
              <strong className="text-foreground">&quot;Enter API key&quot;</strong> field
            </li>
            <li>
              Optionally give it a <strong className="text-foreground">label</strong> (e.g.,
              &quot;Tutorial Key&quot;, &quot;Work Key&quot;)
            </li>
            <li>
              Click <strong className="text-foreground">&quot;Add&quot;</strong> to save the key
            </li>
          </ol>
          <Screenshot
            src="/screenshots/05-settings-apikey-added.png"
            alt="API key added"
          />

          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground mb-4">
            <strong className="text-foreground">Security Note:</strong> API keys are
            stored only in your browser&apos;s local storage. They are masked in the
            UI and never leave your device except when making direct requests to
            the AI provider&apos;s API.
          </div>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Selecting a Model
          </h3>
          <p className="text-muted-foreground mb-2">
            With a provider and API key configured, select the specific AI
            model:
          </p>
          <Screenshot
            src="/screenshots/06-settings-model-dropdown.png"
            alt="Model dropdown"
          />
          <p className="text-muted-foreground mb-2">
            After selecting a model, your configuration is complete:
          </p>
          <Screenshot
            src="/screenshots/07-settings-model-selected.png"
            alt="Model selected"
          />

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Testing the Connection
          </h3>
          <p className="text-muted-foreground mb-2">
            Click <strong className="text-foreground">&quot;Test Connection&quot;</strong> to verify
            your configuration.
          </p>
          <Screenshot
            src="/screenshots/09-settings-test-success.png"
            alt="Test connection success"
          />
          <Screenshot
            src="/screenshots/08-settings-test-error.png"
            alt="Test connection error"
          />
          <p className="text-muted-foreground mb-4">
            Common errors: <strong className="text-foreground">401</strong> (invalid API key),{" "}
            <strong className="text-foreground">429</strong> (quota exceeded),{" "}
            <strong className="text-foreground">Model not found</strong>.
          </p>

          <h3 className="text-lg font-semibold mt-8 mb-3">Custom Endpoints</h3>
          <p className="text-muted-foreground mb-2">
            If you&apos;re running a self-hosted model or using an
            OpenAI-compatible API, switch to the{" "}
            <strong className="text-foreground">&quot;Custom Endpoints&quot;</strong> tab:
          </p>
          <Screenshot
            src="/screenshots/21-settings-custom-endpoints.png"
            alt="Custom endpoints settings"
          />
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground mb-4">
            <li>
              <strong className="text-foreground">Provider Label</strong> (optional) — give your
              endpoint a friendly name
            </li>
            <li>
              <strong className="text-foreground">Base URL</strong> — enter the full base URL
              (e.g., <code className="bg-muted px-1 rounded text-xs">http://localhost:11434/v1</code> for
              Ollama)
            </li>
            <li>
              <strong className="text-foreground">Fetch Models</strong> — click to discover
              available models
            </li>
            <li>
              <strong className="text-foreground">Model ID</strong> — select or type the model
            </li>
            <li>
              <strong className="text-foreground">API Key</strong> (optional) — add if your
              endpoint requires auth
            </li>
            <li>
              <strong className="text-foreground">Test Connection</strong> — verify everything
              works
            </li>
          </ol>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            System Prompt Customization
          </h3>
          <p className="text-muted-foreground mb-2">
            Scroll down on the Settings page to find the{" "}
            <strong className="text-foreground">System Prompt</strong> section:
          </p>
          <Screenshot
            src="/screenshots/22-settings-system-prompt.png"
            alt="System prompt settings"
          />
          <p className="text-muted-foreground mb-2">
            The default system prompt includes{" "}
            <strong className="text-foreground">13 LCSH selection rules</strong> that guide the
            AI. Edit the text directly to add institution-specific rules, or
            click <strong className="text-foreground">&quot;Reset to Default&quot;</strong> to restore.
          </p>
        </Section>

        {/* 3. Using the Wizard */}
        <Section
          id="using-the-wizard"
          title="3. Using the Wizard: Complete Walkthrough"
        >
          <p className="text-muted-foreground mb-4">
            The Wizard is the core feature. Below is a complete walkthrough
            using <strong className="text-foreground">&quot;The Great Gatsby&quot;</strong> by F. Scott
            Fitzgerald as our example.
          </p>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Step 1: Enter Bibliographic Information
          </h3>
          <p className="text-muted-foreground mb-2">
            Navigate to the Wizard by clicking &quot;Start Wizard&quot; on the home page
            or &quot;Wizard&quot; in the nav bar.
          </p>
          <Screenshot
            src="/screenshots/10-wizard-step1-empty.png"
            alt="Wizard step 1 empty form"
          />

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">Field</th>
                  <th className="py-2 pr-4 text-left font-semibold">
                    Required
                  </th>
                  <th className="py-2 text-left font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4 font-medium">Title</td>
                  <td className="py-2 pr-4">Yes*</td>
                  <td className="py-2 text-muted-foreground">
                    The title of the work being cataloged
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Author</td>
                  <td className="py-2 pr-4">No</td>
                  <td className="py-2 text-muted-foreground">
                    The author or creator of the work
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Abstract</td>
                  <td className="py-2 pr-4">No</td>
                  <td className="py-2 text-muted-foreground">
                    A brief summary or description
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Table of Contents</td>
                  <td className="py-2 pr-4">No</td>
                  <td className="py-2 text-muted-foreground">
                    Chapter titles or section headings
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Additional Notes</td>
                  <td className="py-2 pr-4">No</td>
                  <td className="py-2 text-muted-foreground">
                    Any other relevant information
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Upload Images</td>
                  <td className="py-2 pr-4">No</td>
                  <td className="py-2 text-muted-foreground">
                    PNG or JPEG images of book covers, title pages
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            *Title is required unless you upload an image.
          </p>

          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground mb-4">
            <strong className="text-foreground">Important:</strong> Image upload only works
            with vision-capable AI models (e.g., GPT-4o, Gemini 2.5 Flash/Pro).
            Text-only models will ignore uploaded files.
          </div>

          <h4 className="text-base font-semibold mt-6 mb-3">
            Example: Filling Out the Form
          </h4>
          <Screenshot
            src="/screenshots/11-wizard-step1-filled.png"
            alt="Wizard step 1 filled form"
          />

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Generating Suggestions
          </h3>
          <p className="text-muted-foreground mb-2">
            Click <strong className="text-foreground">&quot;Generate LCSH Suggestions&quot;</strong>.
            You&apos;ll see a loading spinner:
          </p>
          <Screenshot
            src="/screenshots/12-wizard-step1-loading.png"
            alt="Generating suggestions"
          />
          <p className="text-muted-foreground mb-2">
            <strong className="text-foreground">What happens behind the scenes:</strong>
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground mb-4">
            <li>Your bibliographic data is sent to the configured AI model</li>
            <li>
              The AI generates subject heading suggestions with reasoning
            </li>
            <li>
              Each suggestion is validated against the Library of Congress (LCSH
              + LCNAF)
            </li>
            <li>
              Similarity scores are calculated using Levenshtein distance
            </li>
            <li>Results automatically advance to Step 2</li>
          </ol>
          <p className="text-muted-foreground mb-4">
            Processing typically takes <strong className="text-foreground">10–30 seconds</strong>.
          </p>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Step 2: Reviewing Validated Suggestions
          </h3>
          <Screenshot
            src="/screenshots/13-wizard-step2-top.png"
            alt="Step 2 validation results"
          />
          <p className="text-muted-foreground mb-4">
            The <strong className="text-foreground">Subject Analysis</strong> shows an
            AI-generated expert analysis of the work&apos;s themes. The{" "}
            <strong className="text-foreground">Validation Summary</strong> shows overall quality.
          </p>

          <h4 className="text-base font-semibold mt-6 mb-3">
            Understanding Individual Terms
          </h4>
          <Screenshot
            src="/screenshots/14-wizard-step2-terms.png"
            alt="Individual term cards"
          />
          <p className="text-muted-foreground mb-2">
            For each term, you&apos;ll see:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground mb-4">
            <li>
              <strong className="text-foreground">Status Icon</strong> — green checkmark (exact
              match) or yellow triangle (closest match)
            </li>
            <li>
              <strong className="text-foreground">Term Name</strong> — the suggested LCSH heading
            </li>
            <li>
              <strong className="text-foreground">Source Badge</strong> —{" "}
              <Badge variant="secondary">LCSH</Badge> or{" "}
              <Badge variant="secondary">LCNAF</Badge>
            </li>
            <li>
              <strong className="text-foreground">Similarity Score</strong> — color-coded
              percentage
            </li>
            <li>
              <strong className="text-foreground">AI Reasoning</strong> — why the AI chose this
              heading
            </li>
            <li>
              <strong className="text-foreground">Best Match</strong> — the official LOC heading
            </li>
            <li>
              <strong className="text-foreground">View on LOC</strong> — direct link to the
              authority record
            </li>
          </ol>

          <Screenshot
            src="/screenshots/15-wizard-step2-additional.png"
            alt="AI additional terms"
          />
          <p className="text-muted-foreground mb-4">
            Terms with an <Badge variant="outline">AI Additional</Badge> badge
            were inferred from the work&apos;s themes beyond what was explicitly
            in the input.
          </p>

          <h4 className="text-base font-semibold mt-6 mb-3">
            Complete Results for &quot;The Great Gatsby&quot;
          </h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">Term</th>
                  <th className="py-2 pr-4 text-left font-semibold">Source</th>
                  <th className="py-2 pr-4 text-left font-semibold">
                    Similarity
                  </th>
                  <th className="py-2 text-left font-semibold">Best Match</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4">American fiction--20th century</td>
                  <td className="py-2 pr-4">LCSH</td>
                  <td className="py-2 pr-4">100%</td>
                  <td className="py-2 text-muted-foreground">
                    American fiction--20th century
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Long Island (N.Y.)--Fiction</td>
                  <td className="py-2 pr-4">LCSH</td>
                  <td className="py-2 pr-4">100%</td>
                  <td className="py-2 text-muted-foreground">
                    Long Island (N.Y.)--Fiction
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Social classes--Fiction</td>
                  <td className="py-2 pr-4">LCSH</td>
                  <td className="py-2 pr-4">100%</td>
                  <td className="py-2 text-muted-foreground">
                    Social classes--Fiction
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Wealth--Fiction</td>
                  <td className="py-2 pr-4">LCSH</td>
                  <td className="py-2 pr-4">100%</td>
                  <td className="py-2 text-muted-foreground">
                    Wealth--Fiction
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Jazz Age--Fiction</td>
                  <td className="py-2 pr-4">LCSH</td>
                  <td className="py-2 pr-4">80%</td>
                  <td className="py-2 text-muted-foreground">
                    Nineteen twenties
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">American Dream--Fiction</td>
                  <td className="py-2 pr-4">LCSH</td>
                  <td className="py-2 pr-4">95%</td>
                  <td className="py-2 text-muted-foreground">
                    American Dream in literature
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Aristocracy (Social class)--Fiction
                  </td>
                  <td className="py-2 pr-4">LCSH</td>
                  <td className="py-2 pr-4">95%</td>
                  <td className="py-2 text-muted-foreground">
                    Aristocracy (Social class)--Fiction
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">American Dream</td>
                  <td className="py-2 pr-4">LCSH</td>
                  <td className="py-2 pr-4">95%</td>
                  <td className="py-2 text-muted-foreground">American Dream</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Step 3: Final Recommendations & MARC Records
          </h3>
          <Screenshot
            src="/screenshots/16-wizard-step3-top.png"
            alt="Step 3 final recommendations"
          />
          <Screenshot
            src="/screenshots/17-wizard-step3-marc.png"
            alt="MARC records"
          />

          <h4 className="text-base font-semibold mt-6 mb-3">
            Example MARC Records Generated
          </h4>
          <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto mb-4">
            <code>{`650 _0 $a American fiction $y 20th century
650 _0 $a Long Island (N.Y.) $x Fiction
650 _0 $a Social classes $x Fiction
650 _0 $a Wealth $x Fiction
650 _0 $a Nineteen twenties
650 _0 $a American Dream in literature
650 _0 $a Aristocracy (Social class) $x Fiction
650 _0 $a American Dream`}</code>
          </pre>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Exporting Your Results
          </h3>
          <Screenshot
            src="/screenshots/18-wizard-step3-export.png"
            alt="Export options"
          />
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">Button</th>
                  <th className="py-2 text-left font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4 font-medium">Back</td>
                  <td className="py-2 text-muted-foreground">
                    Return to Step 2 to review suggestions
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Copy All MARC</td>
                  <td className="py-2 text-muted-foreground">
                    Copy all MARC records to clipboard at once
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Export CSV</td>
                  <td className="py-2 text-muted-foreground">
                    Download a CSV file with all data
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">
                    Save & View History
                  </td>
                  <td className="py-2 text-muted-foreground">
                    Save the session and navigate to History
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 4. Managing History */}
        <Section id="managing-history" title="4. Managing Conversation History">
          <h3 className="text-lg font-semibold mt-6 mb-3">History Table</h3>
          <Screenshot
            src="/screenshots/19-history-with-data.png"
            alt="History table"
          />
          <p className="text-muted-foreground mb-4">
            The table shows date, title, author, term count, and action icons
            (view, export CSV, delete). Bulk actions at the top right:{" "}
            <strong className="text-foreground">&quot;Export All&quot;</strong> and{" "}
            <strong className="text-foreground">&quot;Clear All&quot;</strong>.
          </p>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Session Detail View
          </h3>
          <p className="text-muted-foreground mb-2">
            Click the eye icon on any session to open the detail dialog:
          </p>
          <Screenshot
            src="/screenshots/20-history-detail-dialog.png"
            alt="History detail dialog"
          />

          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Tip:</strong> Export important sessions to CSV
            regularly as a backup. All history data is stored in your browser&apos;s
            local storage — clearing browser data will erase your history.
          </div>
        </Section>

        {/* 5. Validation Scores */}
        <Section
          id="validation-scores"
          title="5. Understanding Validation Scores"
        >
          <p className="text-muted-foreground mb-4">
            The app uses{" "}
            <strong className="text-foreground">
              Levenshtein distance-based similarity scoring
            </strong>{" "}
            to validate AI suggestions against official LOC headings.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">Score</th>
                  <th className="py-2 pr-4 text-left font-semibold">Color</th>
                  <th className="py-2 pr-4 text-left font-semibold">Label</th>
                  <th className="py-2 text-left font-semibold">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4">80–100%</td>
                  <td className="py-2 pr-4 text-green-600">Green</td>
                  <td className="py-2 pr-4">Excellent</td>
                  <td className="py-2 text-muted-foreground">
                    Exact or near-exact match
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">60–79%</td>
                  <td className="py-2 pr-4 text-lime-600">Light Green</td>
                  <td className="py-2 pr-4">Good</td>
                  <td className="py-2 text-muted-foreground">
                    Very close, minor differences
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">40–59%</td>
                  <td className="py-2 pr-4 text-yellow-600">Yellow</td>
                  <td className="py-2 pr-4">Moderate</td>
                  <td className="py-2 text-muted-foreground">
                    Partial match, review recommended
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">20–39%</td>
                  <td className="py-2 pr-4 text-orange-600">Orange</td>
                  <td className="py-2 pr-4">Poor</td>
                  <td className="py-2 text-muted-foreground">
                    Significant differences
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">0–19%</td>
                  <td className="py-2 pr-4 text-red-600">Red</td>
                  <td className="py-2 pr-4">No Match</td>
                  <td className="py-2 text-muted-foreground">
                    No similar LOC heading found
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Dual Authority Validation
          </h3>
          <p className="text-muted-foreground">
            Each term is validated against <strong className="text-foreground">two</strong>{" "}
            Library of Congress databases:{" "}
            <strong className="text-foreground">LCSH</strong> (topical, geographic, genre/form
            subjects) and <strong className="text-foreground">LCNAF</strong> (personal and
            corporate names).
          </p>
        </Section>

        {/* 6. MARC Records */}
        <Section id="marc-records" title="6. Working with MARC Records">
          <h3 className="text-lg font-semibold mt-6 mb-3">
            Understanding the Tags
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">
                    MARC Tag
                  </th>
                  <th className="py-2 pr-4 text-left font-semibold">Source</th>
                  <th className="py-2 text-left font-semibold">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4 font-medium">650</td>
                  <td className="py-2 pr-4">LCSH</td>
                  <td className="py-2 text-muted-foreground">
                    Topical subject headings, geographic headings
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">600</td>
                  <td className="py-2 pr-4">LCNAF</td>
                  <td className="py-2 text-muted-foreground">
                    Personal name subject headings
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">610</td>
                  <td className="py-2 pr-4">LCNAF</td>
                  <td className="py-2 text-muted-foreground">
                    Corporate name subject headings
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Reading the MARC Format
          </h3>
          <p className="text-muted-foreground mb-2">
            Example:{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
              650 _0 $a American fiction $y 20th century
            </code>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-4">
            <li>
              <code className="bg-muted px-1 rounded text-xs">650</code> — MARC field tag
              (topical subject)
            </li>
            <li>
              <code className="bg-muted px-1 rounded text-xs">_0</code> — Indicators (second
              indicator 0 = LCSH)
            </li>
            <li>
              <code className="bg-muted px-1 rounded text-xs">$a</code> — Main heading subfield
            </li>
            <li>
              <code className="bg-muted px-1 rounded text-xs">$y</code> — Chronological
              subdivision
            </li>
            <li>
              <code className="bg-muted px-1 rounded text-xs">$x</code> — General subdivision
            </li>
          </ul>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            Using MARC Records in Your Workflow
          </h3>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>
              <strong className="text-foreground">Copy to ILS</strong> — Use &quot;Copy&quot; or &quot;Copy
              All MARC&quot; to copy records, then paste into your ILS MARC editor
            </li>
            <li>
              <strong className="text-foreground">Export to CSV</strong> — Download CSV files for
              batch import
            </li>
            <li>
              <strong className="text-foreground">Review and Edit</strong> — Always review
              generated MARC records before adding to official catalog records
            </li>
          </ol>
        </Section>

        {/* 7. Tips */}
        <Section id="tips" title="7. Tips & Best Practices">
          <h3 className="text-lg font-semibold mt-6 mb-3">
            For Better AI Suggestions
          </h3>
          <ol className="list-decimal pl-5 space-y-2 text-muted-foreground mb-6">
            <li>
              <strong className="text-foreground">Provide detailed abstracts</strong> — The
              abstract is the most impactful field.
            </li>
            <li>
              <strong className="text-foreground">Include table of contents</strong> — Chapter
              headings help the AI understand structure.
            </li>
            <li>
              <strong className="text-foreground">Upload images</strong> — Book covers often
              contain subject info not in text. (Requires vision-capable model.)
            </li>
            <li>
              <strong className="text-foreground">Be specific in notes</strong> — Mention
              audience, geographic focus, time period.
            </li>
            <li>
              <strong className="text-foreground">Use capable models</strong> — Larger models
              (Gemini 2.5 Pro, GPT-4o) produce better results.
            </li>
          </ol>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            For Better Validation
          </h3>
          <ol className="list-decimal pl-5 space-y-2 text-muted-foreground mb-6">
            <li>
              <strong className="text-foreground">Check alternatives</strong> — When a suggestion
              has moderate similarity, expand the alternatives.
            </li>
            <li>
              <strong className="text-foreground">Verify LOC links</strong> — Click &quot;View on
              LOC&quot; to see the full authority record.
            </li>
            <li>
              <strong className="text-foreground">Review AI reasoning</strong> — The
              justification explains each heading choice.
            </li>
            <li>
              <strong className="text-foreground">Consider source badges</strong> — LCSH (650)
              for topics; LCNAF (600/610) for names.
            </li>
          </ol>

          <h3 className="text-lg font-semibold mt-8 mb-3">
            For Your Workflow
          </h3>
          <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Save sessions</strong> — Always click &quot;Save &
              View History&quot; to preserve your work.
            </li>
            <li>
              <strong className="text-foreground">Export regularly</strong> — Download CSV files
              as backups.
            </li>
            <li>
              <strong className="text-foreground">Customize the prompt</strong> — Tailor LCSH
              rules to your institution.
            </li>
            <li>
              <strong className="text-foreground">Test multiple providers</strong> — Different AI
              models produce different results.
            </li>
            <li>
              <strong className="text-foreground">Always verify</strong> — AI assists but
              doesn&apos;t replace professional judgment.
            </li>
          </ol>
        </Section>

        {/* 8. Troubleshooting */}
        <Section id="troubleshooting" title="8. Troubleshooting">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  &quot;Please configure a model and provider in Settings&quot;
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <strong className="text-foreground">Cause:</strong> No AI model configured.
                <br />
                <strong className="text-foreground">Solution:</strong> Go to Settings, select a
                provider, choose a model, and add an API key.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Test Connection fails with 401 error
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <strong className="text-foreground">Cause:</strong> Invalid API key.
                <br />
                <strong className="text-foreground">Solution:</strong> Double-check your API key
                and ensure it matches the selected provider.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Test Connection fails with 429 error
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <strong className="text-foreground">Cause:</strong> Rate limit or quota exceeded.
                <br />
                <strong className="text-foreground">Solution:</strong> Wait a few minutes, upgrade
                your API plan, or try a different model.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  No suggestions generated or very few terms
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <strong className="text-foreground">Cause:</strong> Insufficient input data or
                model limitations.
                <br />
                <strong className="text-foreground">Solution:</strong> Provide more detailed
                bibliographic information. Try a more capable model.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Low similarity scores</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <strong className="text-foreground">Cause:</strong> AI suggestions don&apos;t closely
                match official LOC headings.
                <br />
                <strong className="text-foreground">Solution:</strong> Provide more specific
                input, use a better model, customize the system prompt, or check
                alternatives.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Data lost after clearing browser data
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <strong className="text-foreground">Cause:</strong> All app data is stored in local
                storage.
                <br />
                <strong className="text-foreground">Solution:</strong> Export history to CSV before
                clearing browser data. There is no cloud backup.
              </CardContent>
            </Card>
          </div>
        </Section>
      </div>
    </div>
  );
}
