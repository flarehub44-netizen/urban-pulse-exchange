import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCreateCommunityMarket } from "@/hooks/use-community-markets";
import { communityShareUrl } from "@/lib/community-market";
import { copy } from "@/copy/pt-BR";
import { useAuth } from "@/hooks/use-auth";

export function CommunityMarketCreateForm() {
  const navigate = useNavigate();
  const { isRegistered } = useAuth();
  const { mutateAsync: create, isPending } = useCreateCommunityMarket();
  const [question, setQuestion] = useState("");
  const [hours, setHours] = useState("24");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [createdMarketId, setCreatedMarketId] = useState<string | null>(null);
  const [createdAccessToken, setCreatedAccessToken] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRegistered) {
      toast.error(copy.auth.registerRequired);
      return;
    }
    const endsAt = new Date(Date.now() + Number(hours) * 60 * 60 * 1000);
    try {
      const res = await create({ question, endsAt, visibility });
      if (visibility === "unlisted" && res.access_token) {
        const url = communityShareUrl(res.market_id, res.access_token);
        setCreatedMarketId(res.market_id);
        setCreatedAccessToken(res.access_token);
        setShareUrl(url);
        toast.success(copy.community.createSuccessPrivate);
      } else {
        toast.success(copy.community.createSuccessPublic);
        navigate({ to: "/markets/$marketId", params: { marketId: res.market_id } });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : copy.errors.generic);
    }
  };

  if (shareUrl) {
    return (
      <div className="surface-card mx-auto max-w-lg space-y-4 p-6">
        <h2 className="text-lg font-semibold">{copy.community.shareTitle}</h2>
        <p className="text-sm text-muted-foreground">{copy.community.shareDesc}</p>
        <input
          readOnly
          value={shareUrl}
          className="w-full rounded-lg border bg-surface px-3 py-2 text-xs mono"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => {
              void navigator.clipboard.writeText(shareUrl);
              toast.success(copy.community.linkCopied);
            }}
          >
            {copy.community.copyLink}
          </button>
          <Link
            to="/markets/$marketId"
            params={{ marketId: createdMarketId ?? "" }}
            search={{ access: createdAccessToken ?? undefined }}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            {copy.community.openMarket}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface-card mx-auto max-w-lg space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">{copy.community.createTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.community.createSubtitle}</p>
      </div>

      {!isRegistered && (
        <p className="text-sm text-warn">
          {copy.auth.registerRequired}{" "}
          <Link to="/auth/signup" search={{ upgrade: "1" }} className="text-primary underline">
            {copy.auth.registerCta}
          </Link>
        </p>
      )}

      <label className="block text-sm">
        <span className="text-muted-foreground">{copy.community.questionLabel}</span>
        <textarea
          required
          minLength={10}
          maxLength={280}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={copy.community.questionPlaceholder}
          className="mt-1 min-h-[88px] w-full rounded-lg border bg-surface px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted-foreground">{copy.community.endsLabel}</span>
        <select
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="mt-1 w-full rounded-lg border bg-surface px-3 py-2"
        >
          <option value="6">6 horas</option>
          <option value="24">24 horas</option>
          <option value="72">3 dias</option>
          <option value="168">7 dias</option>
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm text-muted-foreground">{copy.community.visibilityLabel}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="visibility"
            checked={visibility === "public"}
            onChange={() => setVisibility("public")}
          />
          {copy.community.visibilityPublic}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="visibility"
            checked={visibility === "unlisted"}
            onChange={() => setVisibility("unlisted")}
          />
          {copy.community.visibilityPrivate}
        </label>
      </fieldset>

      <p className="text-xs text-muted-foreground">{copy.community.creatorNote}</p>

      <button
        type="submit"
        disabled={isPending || !isRegistered}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {isPending ? copy.auth.loading : copy.community.createCta}
      </button>
    </form>
  );
}
