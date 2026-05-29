import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCreateCommunityMarket } from "@/hooks/use-community-markets";
import {
  communityShareUrl,
  communityEndsAtMs,
  defaultCommunityEndDate,
  defaultCommunityEndTime,
  validateCommunityEndsAt,
} from "@/lib/community-market";
import { uploadCommunityCover } from "@/lib/community-cover-upload";
import { assertClientImageLimits } from "@/lib/image-upload-guard";
import { copy } from "@/copy/pt-BR";
import { useAuth } from "@/hooks/use-auth";
import { AuthModalTrigger } from "@/components/auth/auth-modal-trigger";

function mapCreateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("ends_at_too_soon")) return copy.community.endsTooSoon;
  if (msg.includes("ends_at_too_far")) return copy.community.endsTooFar;
  if (msg.includes("invalid_cover")) return copy.community.coverUploadError;
  return copy.errors.generic;
}

export function CommunityMarketCreateForm() {
  const navigate = useNavigate();
  const { userId, isRegistered } = useAuth();
  const { mutateAsync: create, isPending } = useCreateCommunityMarket();
  const [question, setQuestion] = useState("");
  const [endDate, setEndDate] = useState(defaultCommunityEndDate);
  const [endTime, setEndTime] = useState(defaultCommunityEndTime);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [createdMarketId, setCreatedMarketId] = useState<string | null>(null);
  const [createdAccessToken, setCreatedAccessToken] = useState<string | null>(null);

  const coverPreviewUrl = useMemo(() => {
    if (coverPreview) return coverPreview;
    return null;
  }, [coverPreview]);

  const onCoverChange = (file: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    if (file) {
      try {
        assertClientImageLimits(file);
      } catch (err: unknown) {
        const code = err instanceof Error ? err.message : "";
        if (code === "invalid_cover_type") toast.error(copy.community.coverTypeError);
        else if (code === "invalid_cover_size") toast.error(copy.community.coverSizeError);
        else toast.error(copy.community.coverUploadError);
        setCoverFile(null);
        setCoverPreview(null);
        return;
      }
    }
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRegistered) {
      toast.error(copy.auth.registerRequired);
      return;
    }

    const endsValidation = validateCommunityEndsAt(endDate, endTime);
    if (endsValidation === "too_soon") {
      toast.error(copy.community.endsTooSoon);
      return;
    }
    if (endsValidation === "too_far") {
      toast.error(copy.community.endsTooFar);
      return;
    }
    if (endsValidation) {
      toast.error(copy.community.endsInvalid);
      return;
    }

    const endsAt = new Date(communityEndsAtMs(endDate, endTime));

    let coverUrl: string | undefined;
    if (coverFile && userId) {
      try {
        coverUrl = await uploadCommunityCover(coverFile, userId);
      } catch (err: unknown) {
        const code = err instanceof Error ? err.message : "";
        if (code === "invalid_cover_type") toast.error(copy.community.coverTypeError);
        else if (code === "invalid_cover_size") toast.error(copy.community.coverSizeError);
        else if (code === "invalid_cover_content") toast.error(copy.community.coverContentError);
        else if (code === "invalid_cover_dimensions") toast.error(copy.community.coverDimensionsError);
        else toast.error(copy.community.coverUploadError);
        return;
      }
    }

    try {
      const res = await create({ question, endsAt, visibility, coverUrl });
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
      toast.error(mapCreateError(err));
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
          <AuthModalTrigger mode="signup" className="text-primary underline">
            {copy.auth.registerCta}
          </AuthModalTrigger>
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
        <span className="text-muted-foreground">{copy.community.coverLabel}</span>
        <p className="text-xs text-muted-foreground/80">{copy.community.coverHint}</p>
        {coverPreviewUrl && (
          <img
            src={coverPreviewUrl}
            alt=""
            className="mt-2 h-32 w-full rounded-lg border object-cover"
          />
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-primary"
          onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)}
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm text-muted-foreground">{copy.community.endsLabel}</legend>
        <p className="text-xs text-muted-foreground/80">{copy.community.endsTimezoneHint}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">{copy.community.endsDateLabel}</span>
            <input
              type="date"
              required
              value={endDate}
              min={defaultCommunityEndDate()}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">{copy.community.endsTimeLabel}</span>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-surface px-3 py-2"
            />
          </label>
        </div>
      </fieldset>

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
