"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getArticleAtchFileIdFromRow,
  resolveArticleImageUrl,
  resolveArticleAttachmentViewUrl,
  ARTICLE_ARCHIVE_LIST_THUMB_SIZE,
} from "@/entities/adminWeb/article/lib";

const PLACEHOLDER_ICON = "/images/adminWeb/icon/ico_file_img.png";

interface ArticleListThumbnailCellProps {
  /** 목록 API 한 줄(아카이브 NTT_IMG_FILE_ID + ATCH_FILE_ID) */
  article: {
    atchFileId?: string;
    nttImgFileId?: string;
    [key: string]: unknown;
  };
  sizeClassName?: string;
}

/**
 * 갤러리(BBST02)·아카이브(BBST03) 목록: 첫 첨부 이미지 썸네일. 없거나 로드 실패 시 플레이스홀더.
 * 파일 뷰 404 등으로 로드 실패 시 다른 seq로 재요청하지 않음(추가 네트워크 방지).
 */
export const ArticleListThumbnailCell: React.FC<ArticleListThumbnailCellProps> = ({
  article,
  sizeClassName = "w-14 h-14",
}) => {
  const atchFileId = useMemo(
    () => getArticleAtchFileIdFromRow(article),
    [article],
  );
  const rawNttImgFileId = useMemo(
    () =>
      String(
        article.nttImgFileId ??
          article.NTT_IMG_FILE_ID ??
          article.nttImgUrl ??
          article.NTT_IMG_URL ??
          "",
      ).trim(),
    [article],
  );
  const isNumericImageId = useMemo(
    () => /^\d+$/.test(rawNttImgFileId),
    [rawNttImgFileId],
  );

  const nttThumb = useMemo(
    () =>
      isNumericImageId
        ? resolveArticleAttachmentViewUrl(
            rawNttImgFileId,
            0,
            ARTICLE_ARCHIVE_LIST_THUMB_SIZE,
          )
        : resolveArticleImageUrl(rawNttImgFileId, {
            thumbSize: ARTICLE_ARCHIVE_LIST_THUMB_SIZE,
          }),
    [isNumericImageId, rawNttImgFileId],
  );
  const nttFull = useMemo(
    () =>
      isNumericImageId
        ? resolveArticleAttachmentViewUrl(rawNttImgFileId, 0)
        : resolveArticleImageUrl(rawNttImgFileId),
    [isNumericImageId, rawNttImgFileId],
  );

  const [useAttachmentFallback, setUseAttachmentFallback] = useState(!nttFull);
  const [showPlaceholder, setShowPlaceholder] = useState(!nttFull && !atchFileId);

  useEffect(() => {
    setUseAttachmentFallback(!nttFull);
    setShowPlaceholder(!nttFull && !atchFileId);
  }, [nttFull, atchFileId]);

  const attachmentThumb = useMemo(
    () =>
      atchFileId
        ? resolveArticleAttachmentViewUrl(
            atchFileId,
            0,
            ARTICLE_ARCHIVE_LIST_THUMB_SIZE,
          )
        : "",
    [atchFileId],
  );
  const attachmentFull = useMemo(
    () => (atchFileId ? resolveArticleAttachmentViewUrl(atchFileId, 0) : ""),
    [atchFileId],
  );

  const displaySrc =
    !useAttachmentFallback && nttThumb ? nttThumb : attachmentThumb;
  const openSrc = !useAttachmentFallback && nttFull ? nttFull : attachmentFull;

  if (!openSrc || showPlaceholder) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded border border-gray-200 bg-gray-100 ${sizeClassName}`}
        aria-hidden
      >
        <img
          src={PLACEHOLDER_ICON}
          alt=""
          className="w-7 h-7 object-contain opacity-40"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50 ${sizeClassName}`}
      onClick={() =>
        window.open(openSrc, "_blank", "noopener,noreferrer")
      }
      title="원본 이미지 보기"
    >
      <img
        src={displaySrc || openSrc}
        alt=""
        className="max-h-full max-w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => {
          if (!useAttachmentFallback && nttThumb) {
            if (atchFileId) {
              setUseAttachmentFallback(true);
              return;
            }
            setShowPlaceholder(true);
            return;
          }
          setShowPlaceholder(true);
        }}
      />
    </button>
  );
};
