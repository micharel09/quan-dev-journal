"use client";
import { useState, type KeyboardEvent } from "react";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import FormTextInput from "@/components/form/text-input/form-text-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useLeavePage from "@/services/leave-page/use-leave-page";
import useFetch from "@/services/api/use-fetch";
import { API_URL } from "@/services/api/config";
import { Article } from "./types";

// Conduit ArticleEditor field order/tag keyboard handling + Brocoders RHF form/actions.
const schema = yup.object({
  title: yup.string().trim().required().max(200),
  summary: yup.string().trim().required().max(500),
  markdown: yup.string().required().max(100000),
});
type Values = yup.InferType<typeof schema>;
function Actions({ editing }: { editing: boolean }) {
  const { isSubmitting, isDirty } = useFormState();
  useLeavePage(isDirty);
  return (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Saving…" : editing ? "Save changes" : "Đăng bài"}
    </Button>
  );
}
export default function ArticleEditor({
  article,
  onSaved,
  onCancel,
}: {
  article?: Article;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const fetch = useFetch();
  const [tags, setTags] = useState<string[]>(article?.tags || []);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const methods = useForm<Values>({
    resolver: yupResolver(schema),
    defaultValues: {
      title: article?.title || "",
      summary: article?.summary || "",
      markdown: article?.markdown || "",
    },
  });
  const addTag = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const tag = draft.trim();
    if (tag && !tags.includes(tag) && tags.length < 20 && tag.length <= 40) {
      setTags([...tags, tag]);
      methods.setValue("title", methods.getValues("title"), {
        shouldDirty: true,
      });
    }
    setDraft("");
  };
  const submit = methods.handleSubmit(async (data) => {
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/v1/articles${article ? `/${encodeURIComponent(article.slug)}` : ""}`,
        {
          method: article ? "PATCH" : "POST",
          body: JSON.stringify({ ...data, tags }),
        }
      );
      if (!response.ok) {
        setError(
          response.status === 401
            ? "Your session expired. Sign in again; your text is still here."
            : response.status === 403
              ? "ADMIN permission is required."
              : "Could not save the article. Please check the fields and try again."
        );
        return;
      }
      methods.reset(data);
      onSaved();
    } catch {
      setError("Could not reach the API. Your text has been preserved.");
    }
  });
  return (
    <FormProvider {...methods}>
      <form
        onSubmit={submit}
        className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6"
      >
        <h1 className="text-xl font-semibold">
          {article ? "Edit article" : "New article"}
        </h1>
        {error && <p role="alert">{error}</p>}
        <FormTextInput<Values> name="title" label="Title" />
        <FormTextInput<Values> name="summary" label="Summary" />
        <FormTextInput<Values>
          name="markdown"
          label="Markdown"
          multiline
          minRows={12}
        />
        <div className="space-y-2">
          <label htmlFor="article-tag">Tags (press Enter)</label>
          <Input
            id="article-tag"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={addTag}
          />
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Button
                type="button"
                variant="secondary"
                aria-label={`Remove tag ${tag}`}
                key={tag}
                onClick={() => setTags(tags.filter((item) => item !== tag))}
              >
                {tag} ×
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Đăng bài publishes immediately. Changing the title preserves the URL.
        </p>
        <div className="flex gap-2">
          <Actions editing={!!article} />
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
