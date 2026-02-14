"use client";

import { useState, useEffect } from "react";
import { useAppStore, type ApiKey } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { getModelsByProvider, type ExtendedModelInfo } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import {
  CLOUD_PROVIDERS,
  LOCAL_PROVIDERS,
  getProviderGroup,
  getProviderHardcodedBaseURL,
  type ProviderGroup,
  type ProviderWithGroup,
} from "@/lib/provider-groups";

export default function SettingsPage() {
  const {
    provider,
    modelId,
    apiKeys,
    providerConfigs,
    systemPromptRules,
    setProvider,
    setModelId,
    setSystemPromptRules,
    resetSystemPromptRules,
    addApiKey,
    removeApiKey,
    setDefaultApiKey,
    getApiKeyForProvider,
    setProviderConfig,
    getProviderConfig,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<ProviderGroup>("cloud");
  const [models, setModels] = useState<ExtendedModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [providerApiKeys, setProviderApiKeys] = useState<ApiKey[]>([]);
  
  const [localBaseURL, setLocalBaseURL] = useState("");
  const [customBaseURL, setCustomBaseURL] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [fetchingModels, setFetchingModels] = useState(false);

  useEffect(() => {
    if (provider) {
      const group = getProviderGroup(provider);
      setActiveTab(group);
      
      const keys = apiKeys.filter((k) => k.provider === provider);
      setProviderApiKeys(keys);
      
      const config = getProviderConfig(provider);
      const hardcoded = getProviderHardcodedBaseURL(provider);
      
      if (group === 'local') {
        setLocalBaseURL(config?.baseURL || hardcoded || "http://127.0.0.1:1234/v1");
      } else if (group === 'openai-compatible') {
        setCustomBaseURL(config?.baseURL || "");
        setCustomLabel(config?.label || "");
      }
      
      if (group === 'cloud') {
        loadCloudModels(provider);
      }
    } else {
      setModels([]);
      setProviderApiKeys([]);
      setLocalBaseURL("");
      setCustomBaseURL("");
      setCustomLabel("");
    }
  }, [provider, apiKeys]);

  useEffect(() => {
    if (activeTab === 'openai-compatible' && !provider) {
      setProviderApiKeys([]);
    }
  }, [activeTab, provider]);

  async function loadCloudModels(providerId: string) {
    try {
      setLoadingModels(true);
      setError(null);
      
      const apiKey = getApiKeyForProvider(providerId);
      
      if (apiKey) {
        const response = await fetch(
          `/api/provider-models?provider=${providerId}&apiKey=${encodeURIComponent(apiKey)}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setModels(data.models || []);
          if (data.models?.length > 0) {
            return;
          }
        }
      }
      
      const modelList = await getModelsByProvider(providerId);
      setModels(modelList);
      
      if (modelList.length === 0) {
        setError("No models found. Please add an API key to fetch the latest models.");
      } else if (!apiKey) {
        setError("Using cached model list. Add an API key to fetch the latest models.");
      }
    } catch (err) {
      console.error("Error loading models:", err);
      setError(err instanceof Error ? err.message : "Failed to load models");
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }

  async function fetchModelsFromEndpoint(baseURL: string) {
    if (!baseURL) return;
    
    try {
      setFetchingModels(true);
      setError(null);
      
      const apiKey = getApiKeyForProvider(provider || "");
      const response = await fetch(
        `/api/local-models?baseURL=${encodeURIComponent(baseURL)}${apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ''}`
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch models");
      }
      
      const data = await response.json();
      const fetchedModels: ExtendedModelInfo[] = (data.models || []).map((m: { id: string; name: string }) => ({
        id: m.id,
        name: m.name,
        provider: provider || "custom",
        providerName: customLabel || "Custom",
      }));
      
      setModels(fetchedModels);
      
      if (fetchedModels.length === 0) {
        setError("No models found at this endpoint. You can enter the model ID manually.");
      }
    } catch (err) {
      console.error("Error fetching models:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch models. You can enter the model ID manually.");
      setModels([]);
    } finally {
      setFetchingModels(false);
    }
  }

  function handleProviderSelect(providerId: string) {
    setProvider(providerId);
    setModelId(null);
    setTestResult(null);
    setError(null);
    setModels([]);
    
    const group = getProviderGroup(providerId);
    const hardcoded = getProviderHardcodedBaseURL(providerId);
    
    if (group === 'local') {
      const config = getProviderConfig(providerId);
      const url = config?.baseURL || hardcoded || "http://127.0.0.1:1234/v1";
      setLocalBaseURL(url);
    } else if (group === 'openai-compatible') {
      const config = getProviderConfig(providerId);
      setCustomBaseURL(config?.baseURL || "");
      setCustomLabel(config?.label || "");
    } else if (group === 'cloud') {
      loadCloudModels(providerId);
    }
  }

  function handleBaseURLChange(url: string) {
    if (activeTab === 'local') {
      setLocalBaseURL(url);
      if (provider) {
        setProviderConfig({ provider, baseURL: url });
      }
    } else if (activeTab === 'openai-compatible') {
      setCustomBaseURL(url);
      if (provider) {
        setProviderConfig({ provider, baseURL: url, label: customLabel });
      }
    }
  }

  function handleAddKey() {
    let effectiveProvider = provider;
    
    if (activeTab === 'openai-compatible' && !provider) {
      effectiveProvider = customLabel?.toLowerCase().replace(/\s+/g, '-') || `custom-${Date.now()}`;
      setProvider(effectiveProvider);
    }
    
    if (!effectiveProvider || !newApiKey.trim()) return;

    addApiKey({
      provider: effectiveProvider,
      key: newApiKey.trim(),
      label: newKeyLabel.trim() || undefined,
    });

    setNewApiKey("");
    setNewKeyLabel("");
    const keys = useAppStore.getState().apiKeys.filter((k) => k.provider === effectiveProvider);
    setProviderApiKeys(keys);
  }

  function handleRemoveKey(keyId: string) {
    removeApiKey(keyId);
    const keys = useAppStore.getState().apiKeys.filter((k) => k.provider === provider);
    setProviderApiKeys(keys);
  }

  function handleSetDefault(keyId: string) {
    setDefaultApiKey(keyId);
    const keys = useAppStore.getState().apiKeys.filter((k) => k.provider === provider);
    setProviderApiKeys(keys);
  }

  async function testConnection() {
    const group = getProviderGroup(provider || "");
    const testApiKey = getApiKeyForProvider(provider || "");
    const effectiveModelId = modelId;
    const effectiveBaseURL = group === 'local' ? localBaseURL : group === 'openai-compatible' ? customBaseURL : undefined;
    
    if (!effectiveModelId) {
      setTestResult({
        success: false,
        message: "Please enter a model ID",
      });
      return;
    }
    
    if (group === 'openai-compatible' && !customBaseURL) {
      setTestResult({
        success: false,
        message: "Please enter a Base URL",
      });
      return;
    }
    
    if (!testApiKey && group === 'cloud') {
      setTestResult({
        success: false,
        message: "Please add an API key for this provider",
      });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const effectiveProvider = group === 'openai-compatible' 
        ? (customLabel?.toLowerCase().replace(/\s+/g, '-') || 'openai-compatible')
        : provider;

      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: effectiveModelId,
          provider: effectiveProvider,
          apiKey: testApiKey,
          apiKeys: apiKeys.filter((k) => k.provider === provider),
          baseURL: effectiveBaseURL,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection test failed");
      }

      setTestResult({
        success: true,
        message: "Connection successful! Your configuration is working correctly.",
      });
    } catch (err) {
      console.error("Test connection failed:", err);
      let errorMessage = "Connection failed. Please check your configuration.";
      
      if (err instanceof Error) {
        errorMessage = err.message;
        if (err.message.includes("not found")) {
          errorMessage = `Model not found: ${modelId}. Please select a different model.`;
        } else if (err.message.includes("401") || err.message.includes("Invalid API key")) {
          errorMessage = "Invalid API key. Please check your API key and try again.";
        } else if (err.message.includes("403") || err.message.includes("permission")) {
          errorMessage = "API key does not have permission to access this model.";
        } else if (err.message.includes("429") || err.message.includes("rate limit")) {
          errorMessage = "Rate limit exceeded. Please try again later.";
        } else if (err.message.includes("network") || err.message.includes("fetch") || err.message.includes("connect")) {
          errorMessage = "Network error. Please check the BaseURL and your internet connection.";
        }
      }

      setTestResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setTesting(false);
    }
  }

  function getProviderOptionsForTab(tab: ProviderGroup): ProviderWithGroup[] {
    if (tab === 'cloud') return CLOUD_PROVIDERS;
    if (tab === 'local') return LOCAL_PROVIDERS;
    return [];
  }

  function renderProviderSelect(providers: ProviderWithGroup[]) {
    return (
      <div className="space-y-2">
        <Label htmlFor="provider">Provider</Label>
        <Select
          value={provider || ""}
          onValueChange={handleProviderSelect}
        >
          <SelectTrigger id="provider">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  function renderBaseURLField(group: ProviderGroup) {
    if (group === 'cloud') return null;
    
    const url = group === 'local' ? localBaseURL : customBaseURL;
    const defaultURL = group === 'local' 
      ? (getProviderHardcodedBaseURL(provider || "") || "http://127.0.0.1:1234/v1")
      : "";
    
    return (
      <div className="space-y-2">
        <Label htmlFor="baseURL">Base URL</Label>
        <div className="flex gap-2">
          <Input
            id="baseURL"
            value={url}
            onChange={(e) => handleBaseURLChange(e.target.value)}
            placeholder={defaultURL || "https://api.example.com/v1"}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchModelsFromEndpoint(url || defaultURL)}
            disabled={fetchingModels || !(url || defaultURL)}
            title="Fetch models from endpoint"
          >
            {fetchingModels ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        {group === 'local' && (
          <p className="text-xs text-muted-foreground">
            Default: {defaultURL}
          </p>
        )}
      </div>
    );
  }

  function renderModelSelect(group: ProviderGroup) {
    return (
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <div className="flex gap-2">
          <Select
            value={modelId || ""}
            onValueChange={setModelId}
            disabled={loadingModels}
          >
            <SelectTrigger id="model" className="flex-1">
              <SelectValue placeholder={loadingModels ? "Loading models..." : "Select a model"} />
            </SelectTrigger>
            <SelectContent>
              {models.length === 0 && !loadingModels && (
                <SelectItem value="none" disabled>No models available</SelectItem>
              )}
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {group === 'cloud' && provider && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadCloudModels(provider)}
              disabled={loadingModels}
              title="Refresh models"
            >
              {loadingModels ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        
        {loadingModels && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading models...
          </p>
        )}
      </div>
    );
  }

  function renderApiKeyCard() {
    const group = activeTab;
    const isOptional = group !== 'cloud';
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Keys</CardTitle>
          <CardDescription>
            {isOptional 
              ? "API key is optional for this provider."
              : "Manage API keys for this provider."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter API key"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              type="password"
              className="flex-1"
            />
            <Input
              placeholder="Label (optional)"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              className="w-32"
            />
            <Button onClick={handleAddKey} disabled={!newApiKey.trim()}>
              Add
            </Button>
          </div>

          {providerApiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isOptional 
                ? "No API keys added. Add one if your endpoint requires authentication."
                : "No API keys added yet. Add one above to get started."}
            </p>
          ) : (
            <div className="space-y-2">
              {providerApiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center gap-2 p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {key.label || `Key ${key.id.slice(-4)}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {key.key.slice(0, 8)}...{key.key.slice(-4)}
                    </div>
                  </div>
                  {key.isDefault && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                  {!key.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(key.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveKey(key.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderConfigPanel(group: ProviderGroup) {
    const providers = getProviderOptionsForTab(group);
    
    if (group === 'openai-compatible') {
      return renderOpenAICompatiblePanel();
    }
    
    return (
      <div className="space-y-4">
        {renderProviderSelect(providers)}
        
        {provider && getProviderGroup(provider) === group && (
          <>
            {renderBaseURLField(group)}
            {renderModelSelect(group)}
            {renderApiKeyCard()}
            
            <Button 
              onClick={testConnection} 
              disabled={testing || !provider || !modelId || (!getApiKeyForProvider(provider) && group === 'cloud')}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    );
  }

  function renderOpenAICompatiblePanel() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customLabel">Provider Label (optional)</Label>
          <Input
            id="customLabel"
            value={customLabel}
            onChange={(e) => {
              setCustomLabel(e.target.value);
              if (provider) {
                setProviderConfig({ 
                  provider, 
                  baseURL: customBaseURL, 
                  label: e.target.value 
                });
              }
            }}
            placeholder="My Custom Endpoint"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customBaseURL">Base URL *</Label>
          <div className="flex gap-2">
            <Input
              id="customBaseURL"
              value={customBaseURL}
              onChange={(e) => {
                setCustomBaseURL(e.target.value);
                if (provider) {
                  setProviderConfig({ 
                    provider, 
                    baseURL: e.target.value, 
                    label: customLabel 
                  });
                }
              }}
              placeholder="https://api.example.com/v1"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const providerId = provider || customLabel?.toLowerCase().replace(/\s+/g, '-') || `custom-${Date.now()}`;
                if (!provider) {
                  setProvider(providerId);
                  setProviderConfig({ 
                    provider: providerId, 
                    baseURL: customBaseURL, 
                    label: customLabel 
                  });
                }
                fetchModelsFromEndpoint(customBaseURL);
              }}
              disabled={fetchingModels || !customBaseURL}
              title="Fetch models from endpoint"
            >
              {fetchingModels ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="model">Model ID *</Label>
          <div className="flex gap-2">
            <Input
              id="model"
              value={modelId || ""}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="Enter model ID (e.g., gpt-4, llama-3)"
              className="flex-1"
              list="model-suggestions"
            />
            <datalist id="model-suggestions">
              {models.map((m) => (
                <option key={m.id} value={m.id} />
              ))}
            </datalist>
          </div>
          {models.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {models.length} model(s) found. Click in the input to see suggestions.
            </p>
          )}
        </div>
        
        {renderApiKeyCard()}
        
        <Button 
          onClick={testConnection} 
          disabled={testing || !customBaseURL || !modelId}
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>

        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your AI model provider and model for LCSH recommendations
        </p>
      </div>

      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>AI Model Configuration</CardTitle>
            <CardDescription>
              Select your preferred AI model provider and model. Your API key is stored locally in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProviderGroup)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cloud">Cloud Providers</TabsTrigger>
                <TabsTrigger value="local">Local Models</TabsTrigger>
                <TabsTrigger value="openai-compatible">Custom Endpoints</TabsTrigger>
              </TabsList>
              
              <TabsContent value="cloud" className="mt-4">
                {renderConfigPanel('cloud')}
              </TabsContent>
              
              <TabsContent value="local" className="mt-4">
                {renderConfigPanel('local')}
              </TabsContent>
              
              <TabsContent value="openai-compatible" className="mt-4">
                {renderConfigPanel('openai-compatible')}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
            <CardDescription>
              Customize the instructions given to the AI model for generating LCSH recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt Rules</Label>
              <Textarea
                id="systemPrompt"
                value={systemPromptRules}
                onChange={(e) => setSystemPromptRules(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            </div>
            <Button variant="outline" onClick={resetSystemPromptRules}>
              Reset to Default
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
