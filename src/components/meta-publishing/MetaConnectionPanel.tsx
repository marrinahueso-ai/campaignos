"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  connectMetaWithUserTokenAction,
  disconnectMetaConnectionAction,
  saveMetaConnectionAction,
} from "@/lib/meta-publishing/connection-actions";
import {
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection-utils";
import { META_OAUTH_SCOPE_LIST } from "@/lib/meta-publishing/oauth-scopes";
import type { MetaConnection } from "@/lib/meta-publishing/types";

interface MetaConnectionPanelProps {
  connection: MetaConnection | null;
  configuredViaEnv: boolean;
  integrationConfigured: boolean;
  returnTo?: string;
  oauthError?: string | null;
}

export function MetaConnectionPanel({
  connection,
  configuredViaEnv,
  integrationConfigured,
  returnTo = "/settings/meta",
  oauthError = null,
}: MetaConnectionPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(oauthError === "no_pages");
  const [isPending, startTransition] = useTransition();

  const connected = isMetaConnectionConfigured(connection);
  const hasInstagram = isInstagramPublishingConfigured(connection);
  const reconnectParams = new URLSearchParams({ returnTo });
  if (connected && connection?.facebookPageId) {
    reconnectParams.set("pageId", connection.facebookPageId);
    reconnectParams.set("auth_type", "rerequest");
  }
  const connectHref = `/api/meta/oauth/start?${reconnectParams.toString()}`;

  const metaSetupSteps = (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-cos-muted">
      <li>
        Open{" "}
        <a
          href="https://developers.facebook.com/apps/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-cos-accent hover:text-cos-muted"
        >
          Meta Developer Dashboard
        </a>
        . If the app only has <strong className="font-medium text-cos-text">Facebook Login</strong>,
        create a <strong className="font-medium text-cos-text">new app</strong> — Facebook Login is
        incompatible with Page/Instagram publishing use cases.
      </li>
      <li>
        Add use case <strong className="font-medium text-cos-text">Manage everything on your Page</strong>{" "}
        → Customize → Permissions and features → enable{" "}
        <code className="rounded bg-cos-bg px-1">pages_show_list</code>,{" "}
        <code className="rounded bg-cos-bg px-1">pages_read_engagement</code>,{" "}
        <code className="rounded bg-cos-bg px-1">pages_manage_posts</code>, and{" "}
        <code className="rounded bg-cos-bg px-1">business_management</code> (set each to{" "}
        <strong className="font-medium text-cos-text">Ready for testing</strong>).
      </li>
      <li>
        Add use case{" "}
        <strong className="font-medium text-cos-text">Manage messaging &amp; content on Instagram</strong>{" "}
        → Customize → enable{" "}
        <code className="rounded bg-cos-bg px-1">instagram_basic</code> and{" "}
        <code className="rounded bg-cos-bg px-1">instagram_content_publish</code> (Ready for testing).
      </li>
      <li>
        Under <strong className="font-medium text-cos-text">Facebook Login for Business → Configurations</strong>,
        create a configuration including the permissions above. Copy its{" "}
        <code className="rounded bg-cos-bg px-1">config_id</code> into{" "}
        <code className="rounded bg-cos-bg px-1">META_OAUTH_CONFIG_ID</code> on your server (optional
        but recommended for Business apps).
      </li>
      <li>
        Under <strong className="font-medium text-cos-text">Facebook Login for Business → Settings</strong>,
        add your OAuth redirect URL:{" "}
        <code className="rounded bg-cos-bg px-1">/api/meta/oauth/callback</code> (full URL on your
        domain).
      </li>
      <li>
        Under <strong className="font-medium text-cos-text">App Settings → Basic</strong>, add your
        site domain to <strong className="font-medium text-cos-text">App Domains</strong> and save.
      </li>
    </ol>
  );

  function handleQuickConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const preferredPageId = String(form.get("preferredPageId") ?? "").trim();
    startTransition(async () => {
      const result = await connectMetaWithUserTokenAction({
        userAccessToken: String(form.get("userAccessToken") ?? ""),
        preferredPageId: preferredPageId || undefined,
      });

      if (!result.success) {
        setError(result.error ?? "Could not connect Meta.");
        return;
      }

      setMessage(
        result.pageName
          ? `Connected to ${result.pageName}${result.hasInstagram ? "" : " (Facebook only — Instagram not linked yet)"}.`
          : "Meta connection saved.",
      );
      router.refresh();
    });
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveMetaConnectionAction({
        facebookPageId: String(form.get("facebookPageId") ?? ""),
        instagramAccountId: String(form.get("instagramAccountId") ?? ""),
        pageAccessToken: String(form.get("pageAccessToken") ?? ""),
      });

      if (!result.success) {
        setError(result.error ?? "Could not save Meta connection.");
        return;
      }

      setMessage(
        result.pageName
          ? `Connected to ${result.pageName}. Auto-publish is ready.`
          : "Meta connection saved.",
      );
      router.refresh();
    });
  }

  function handleDisconnect() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await disconnectMetaConnectionAction();
      if (!result.success) {
        setError(result.error ?? "Could not disconnect.");
        return;
      }
      setMessage("Meta disconnected.");
      router.refresh();
    });
  }

  const isDev = process.env.NODE_ENV === "development";
  const showFallbackConnect = !configuredViaEnv && integrationConfigured && !connected;

  function renderAdvancedConnect(showManualFields: boolean) {
    return (
      <div className="space-y-6">
        <div className="space-y-4 rounded-xl border border-cos-border bg-cos-bg/40 p-4">
          <div>
            <h3 className="text-sm font-semibold text-cos-text">Connect with Page ID (fallback)</h3>
            <p className="mt-1 text-sm text-cos-muted">
              Use this when Facebook OAuth succeeds but CampaignOS cannot list your Page — common
              for Pages in Meta Business Suite. Paste a user token from Graph API Explorer and your
              Page ID.
            </p>
          </div>

          <ol className="list-decimal space-y-1 pl-5 text-sm text-cos-muted">
            <li>
              Open{" "}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-cos-accent hover:text-cos-muted"
              >
                Graph API Explorer
              </a>{" "}
              → select your app
            </li>
            <li>
              Add permissions: <code className="rounded bg-white px-1">pages_show_list</code>,{" "}
              <code className="rounded bg-white px-1">pages_manage_posts</code>,{" "}
              <code className="rounded bg-white px-1">business_management</code>
            </li>
            <li>Generate Access Token → approve → select your Page in the dialog</li>
            <li>Copy the token, enter your Page ID below, and connect</li>
          </ol>

          <form onSubmit={handleQuickConnect} className="space-y-3">
            <Input
              name="preferredPageId"
              label="Facebook Page ID"
              placeholder="123456789012345"
              defaultValue={connection?.facebookPageId ?? ""}
              disabled={isPending}
            />
            <Input
              name="userAccessToken"
              label="Graph API user access token"
              type="password"
              placeholder="EAAM..."
              disabled={isPending}
            />
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Connecting…" : "Connect with token + Page ID"}
            </Button>
          </form>
        </div>

        {showManualFields ? (
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              name="facebookPageId"
              label="Facebook Page ID"
              placeholder="123456789012345"
              defaultValue={connection?.id === "env" ? "" : (connection?.facebookPageId ?? "")}
              disabled={isPending}
            />
            <Input
              name="instagramAccountId"
              label="Instagram Business Account ID (optional)"
              placeholder="17841400000000000"
              defaultValue={
                connection?.id === "env" ? "" : (connection?.instagramAccountId ?? "")
              }
              disabled={isPending}
            />
            <Input
              name="pageAccessToken"
              label="Page Access Token"
              type="password"
              placeholder="EAAG..."
              disabled={isPending}
            />

            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Saving…" : "Save manual connection"}
            </Button>
          </form>
        ) : null}
      </div>
    );
  }

  if (!configuredViaEnv && !integrationConfigured) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-cos-muted">
          Meta publishing is not set up yet. Contact your administrator.
        </p>
        {isDev && (
          <>
            <button
              type="button"
              className="text-xs text-cos-muted/70 hover:text-cos-muted"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {showAdvanced ? "Hide advanced / developer setup" : "Advanced / Developer setup"}
            </button>
            {showAdvanced && (
              <div className="space-y-4 rounded-xl border border-dashed border-cos-border bg-cos-bg/40 p-4 text-sm text-cos-muted">
                <p>
                  Add Meta app credentials so volunteers can connect with Facebook OAuth. For
                  localhost, set <code className="rounded bg-cos-bg px-1">META_APP_ID</code> and{" "}
                  <code className="rounded bg-cos-bg px-1">META_APP_SECRET</code> in{" "}
                  <code className="rounded bg-cos-bg px-1">.env.local</code>.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Create an app at{" "}
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cos-text underline-offset-2 hover:underline"
                    >
                      developers.facebook.com
                    </a>{" "}
                    with Page + Instagram use cases (not Facebook Login alone).
                  </li>
                  <li>
                    Set OAuth redirect URL to{" "}
                    <code className="rounded bg-cos-bg px-1">/api/meta/oauth/callback</code>
                  </li>
                  <li>
                    Enable scopes (Ready for testing):{" "}
                    {META_OAUTH_SCOPE_LIST.map((scope) => (
                      <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                        {scope}
                      </code>
                    ))}
                  </li>
                </ul>
                {metaSetupSteps}
                <form onSubmit={handleQuickConnect} className="space-y-3 pt-2">
                  <Input
                    name="userAccessToken"
                    label="Graph API access token (dev fallback)"
                    type="password"
                    placeholder="EAAM..."
                    disabled={isPending}
                  />
                  <Button type="submit" variant="secondary" disabled={isPending}>
                    {isPending ? "Connecting…" : "Connect with token"}
                  </Button>
                </form>
              </div>
            )}
          </>
        )}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {configuredViaEnv && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Meta is connected via server environment variables. Auto-publish is active.
        </p>
      )}

      {connection && !configuredViaEnv && connected && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Connected to {connection.pageName ?? "Facebook Page"}.
          {hasInstagram
            ? " Facebook and Instagram auto-posting is ready."
            : " Facebook auto-posting is ready. Link Instagram to your Page to enable IG posts."}
          {connection.tokenExpiresAt ? (
            <>
              {" "}
              Token refreshes before{" "}
              {new Date(connection.tokenExpiresAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              .
            </>
          ) : null}
        </p>
      )}

      {!configuredViaEnv && integrationConfigured && (
        <div className="space-y-4">
          <Button href={connectHref} disabled={isPending}>
            {connected ? "Reconnect with Facebook" : "Connect with Facebook"}
          </Button>
          {!connected && (
            <>
              <p className="text-sm text-cos-muted">
                Sign in with Facebook once. CampaignOS handles Page access so approved posts publish
                automatically.
              </p>
              {oauthError === "no_pages" ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  OAuth connected your Facebook account but could not resolve a Page token. Open{" "}
                  <strong>Advanced connect</strong> below, or set{" "}
                  <code className="rounded bg-white/80 px-1">META_FACEBOOK_PAGE_ID</code> on the
                  server to your Page ID and click Reconnect.
                </p>
              ) : null}
              <details className="rounded-xl border border-cos-border bg-cos-bg/40 p-4 text-sm">
                <summary className="cursor-pointer font-medium text-cos-text">
                  Meta Developer Console setup (fix &ldquo;Invalid Scopes&rdquo; errors)
                </summary>
                <div className="mt-3 space-y-3 text-cos-muted">
                  <p>
                    CampaignOS requests:{" "}
                    {META_OAUTH_SCOPE_LIST.map((scope) => (
                      <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                        {scope}
                      </code>
                    ))}
                    . Meta rejects any scope not registered on your app via a use case.
                  </p>
                  {metaSetupSteps}
                </div>
              </details>
            </>
          )}
        </div>
      )}

      {showFallbackConnect && (
        <div>
          <button
            type="button"
            className="text-sm font-medium text-cos-accent hover:text-cos-muted"
            onClick={() => setShowAdvanced((value) => !value)}
          >
            {showAdvanced ? "Hide advanced connect" : "Advanced connect (Page ID + token)"}
          </button>

          {showAdvanced && <div className="mt-4">{renderAdvancedConnect(isDev)}</div>}
        </div>
      )}

      {isDev && !configuredViaEnv && connected && (
        <div>
          <button
            type="button"
            className="text-xs text-cos-muted/70 hover:text-cos-muted"
            onClick={() => setShowAdvanced((value) => !value)}
          >
            {showAdvanced ? "Hide advanced / developer setup" : "Advanced / Developer setup"}
          </button>

          {showAdvanced && <div className="mt-4">{renderAdvancedConnect(true)}</div>}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      {connection && !configuredViaEnv && (
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleDisconnect}>
          Disconnect
        </Button>
      )}
    </div>
  );
}
