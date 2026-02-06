"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, usePaginatedQuery } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import {
  FileText,
  Plus,
  Github,
  LogOut,
  Loader,
  Clock,
  Edit,
  Share2,
  Trash2,
  User,
  Settings,
  HelpCircle,
  LayoutDashboard,
} from "lucide-react";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export default function DashboardPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const { results: documents, status, loadMore } = usePaginatedQuery(
    api.documents.list,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 20 }
  );
  const createDocument = useMutation(api.documents.create);
  const deleteDocument = useMutation(api.documents.remove);

  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"documents"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isLoadingDocs = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";

  // Redirect to sign-in if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push("/sign-in");
  }

  const handleCreateDocument = async (type: "markdown" | "latex") => {
    if (type === "latex") {
      router.push("/latex-editor");
      return;
    }

    try {
      const documentId = await createDocument({});
      router.push(`/editor?doc=${documentId}`);
    } catch (error) {
      console.error("Failed to create document:", error);
    }
  };

  const handleDeleteDocument = async (docId: Id<"documents">) => {
    setIsDeleting(true);
    try {
      await deleteDocument({ id: docId });
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        {/* Background */}
        <div
          className="fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139, 92, 246, 0.25), transparent 70%), #000000",
          }}
        />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Sign in to Zendor
          </h1>
          <p className="text-zinc-400 text-center max-w-md mb-8">
            Connect your GitHub account to save your documents and access them
            from anywhere.
          </p>
          <Link
            href="/sign-in"
            className="flex items-center gap-3 px-6 py-3 bg-white text-zinc-900 rounded-xl font-medium hover:bg-zinc-100 transition-colors"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </Link>
          <Link
            href="/editor"
            className="mt-4 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
          >
            or continue without signing in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139, 92, 246, 0.15), transparent 70%), #000000",
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">Zendor</span>
          </Link>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-linear-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || "User"}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || "user@example.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard")}
                  className="cursor-pointer"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/editor")}
                  className="cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>New Document</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/settings")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.open("https://github.com/thea11ylabs/zendor", "_blank")}
                  className="cursor-pointer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  <span>GitHub</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open("https://docs.zendor.dev", "_blank")}
                  className="cursor-pointer"
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Documentation</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => authClient.signOut()}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Your Documents
              </h1>
              <p className="text-zinc-400">
                Create and manage your markdown documents
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Document
            </button>
          </div>

          {/* Documents List */}
          {documents && documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-violet-700 transition-colors group relative"
                >
                  <Link href={`/editor?doc=${doc._id}`} className="block">
                    <div className="flex items-start justify-between mb-3">
                      <FileText className="w-6 h-6 text-violet-400" />
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-400 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-zinc-400 text-sm line-clamp-2">
                      {doc.content || "Empty document"}
                    </p>
                  </Link>

                  {/* Hover Actions */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-zinc-800/90 backdrop-blur-sm rounded-lg p-1 border border-zinc-700">
                    <Link
                      href={`/editor?doc=${doc._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-zinc-700 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-zinc-300" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const shareUrl = doc.shareToken
                          ? `${window.location.origin}/share/${doc.shareToken}`
                          : null;
                        if (shareUrl) {
                          navigator.clipboard.writeText(shareUrl);
                        } else {
                          router.push(`/editor?doc=${doc._id}`);
                        }
                      }}
                      className="p-2 hover:bg-zinc-700 rounded-md transition-colors"
                      title={doc.shareToken ? "Copy share link" : "Create share link"}
                    >
                      <Share2 className="w-4 h-4 text-zinc-300" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteConfirmId(doc._id);
                      }}
                      className="p-2 hover:bg-red-600 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : isLoadingDocs ? (
            <div className="text-center py-20">
              <Loader className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
            </div>
          ) : (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                No documents yet
              </h3>
              <p className="text-zinc-500 mb-6">
                Create your first document to get started
              </p>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Document
              </button>
            </div>
          )}

          {/* Load More Button */}
          {canLoadMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => loadMore(20)}
                className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create Document Type Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">
              Create New Document
            </h3>
            <p className="text-zinc-400 text-sm mb-6">
              Choose the type of document you want to create:
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  handleCreateDocument("markdown");
                }}
                className="flex flex-col items-center gap-3 p-6 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-600 rounded-xl transition-all group"
              >
                <FileText className="w-8 h-8 text-violet-400 group-hover:text-violet-300" />
                <div className="text-center">
                  <div className="font-semibold text-white mb-1">Markdown</div>
                  <div className="text-xs text-zinc-400">GitHub-flavored markdown with LaTeX math</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  handleCreateDocument("latex");
                }}
                className="flex flex-col items-center gap-3 p-6 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-violet-600 rounded-xl transition-all group"
              >
                <FileText className="w-8 h-8 text-violet-400 group-hover:text-violet-300" />
                <div className="text-center">
                  <div className="font-semibold text-white mb-1">LaTeX</div>
                  <div className="text-xs text-zinc-400">Pure LaTeX document with full typesetting</div>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowCreateDialog(false)}
              className="w-full px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Delete Document
                </h3>
                <p className="text-zinc-400 text-sm mb-6">
                  Are you sure you want to delete this document? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(deleteConfirmId)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
