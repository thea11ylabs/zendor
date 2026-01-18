"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, Link2, Copy, Check, Globe, Lock, Edit, Eye } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type SharePermission = "view" | "edit";

interface ShareDialogProps {
  documentId: Id<"documents">;
  isPublic?: boolean;
  shareToken?: string;
  sharePermission?: SharePermission;
  onClose: () => void;
}

export function ShareDialog({
  documentId,
  isPublic,
  shareToken,
  sharePermission,
  onClose,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [localShareToken, setLocalShareToken] = useState(shareToken);
  const [localIsPublic, setLocalIsPublic] = useState(isPublic);
  const [localPermission, setLocalPermission] = useState<SharePermission>(
    sharePermission || "view"
  );

  const generateShareLink = useMutation(api.documents.generateShareLink);
  const updateSharePermission = useMutation(
    api.documents.updateSharePermission
  );
  const revokeShareLink = useMutation(api.documents.revokeShareLink);

  const shareUrl = localShareToken
    ? `${window.location.origin}/share/${localShareToken}`
    : "";

  const handleGenerateLink = async () => {
    try {
      const result = await generateShareLink({
        id: documentId,
        permission: localPermission,
      });
      setLocalShareToken(result.shareToken);
      setLocalIsPublic(true);
    } catch (error) {
      console.error("Failed to generate share link:", error);
    }
  };

  const handlePermissionChange = async (permission: SharePermission) => {
    try {
      setLocalPermission(permission);
      if (localIsPublic) {
        await updateSharePermission({ id: documentId, permission });
      }
    } catch (error) {
      console.error("Failed to update permission:", error);
    }
  };

  const handleRevokeLink = async () => {
    try {
      await revokeShareLink({ id: documentId });
      setLocalShareToken(undefined);
      setLocalIsPublic(false);
      setLocalPermission("view");
    } catch (error) {
      console.error("Failed to revoke share link:", error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Share Document
            </h2>
          </div>
          <Button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {localIsPublic && localShareToken ? (
            <>
              {/* Status */}
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Globe className="w-4 h-4" />
                <span>Document is publicly accessible</span>
              </div>

              {/* Permission Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Permission Level
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePermissionChange("view")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      localPermission === "view"
                        ? "bg-violet-100 dark:bg-violet-900/30 border-violet-600 text-violet-700 dark:text-violet-400"
                        : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View Only</span>
                  </button>
                  <button
                    onClick={() => handlePermissionChange("edit")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      localPermission === "edit"
                        ? "bg-violet-100 dark:bg-violet-900/30 border-violet-600 text-violet-700 dark:text-violet-400"
                        : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                    <span className="text-sm font-medium">Can Edit</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {localPermission === "view"
                    ? "People can view but cannot make changes"
                    : "People can view and edit this document"}
                </p>
              </div>

              {/* Share URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Share Link
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Revoke */}
              <button
                onClick={handleRevokeLink}
                className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors font-medium"
              >
                Revoke Share Link
              </button>
            </>
          ) : (
            <>
              {/* Not shared */}
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Lock className="w-4 h-4" />
                <span>Document is private</span>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Generate a public link to share this document with others.
              </p>

              {/* Permission Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Permission Level
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocalPermission("view")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      localPermission === "view"
                        ? "bg-violet-100 dark:bg-violet-900/30 border-violet-600 text-violet-700 dark:text-violet-400"
                        : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View Only</span>
                  </button>
                  <button
                    onClick={() => setLocalPermission("edit")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      localPermission === "edit"
                        ? "bg-violet-100 dark:bg-violet-900/30 border-violet-600 text-violet-700 dark:text-violet-400"
                        : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                    <span className="text-sm font-medium">Can Edit</span>
                  </button>
                </div>
              </div>

              {/* Generate */}
              <button
                onClick={handleGenerateLink}
                className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors font-medium"
              >
                Generate Share Link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
