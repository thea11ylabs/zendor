"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

export enum ConvexErrorCode {
    NETWORK_ERROR = "NETWORK_ERROR",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    NOT_FOUND = "NOT_FOUND",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    STREAM_IN_PROGRESS = "STREAM_IN_PROGRESS",
    CHAT_NOT_FOUND = "CHAT_NOT_FOUND",
    DOCUMENT_NOT_FOUND = "DOCUMENT_NOT_FOUND",
    UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
}


export function useConvexErrorHandler() {
    const handleError = useCallback((error: unknown, operation: string) => {
        console.error(`Convex error in ${operation}:`, error);

        let errorMessage = "Something went wrong";

        if (error instanceof ConvexError) {
            errorMessage = String(error.data);
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else {
            errorMessage = String(error);
        }

        // Show user-friendly toast
        toast.error(errorMessage, {
            duration: 3000,
        });

        return error;
    }, []);

    const executeWithErrorHandling = useCallback(
        async <T>(
            operation: () => Promise<T>,
            operationName: string
        ): Promise<T | null> => {
            try {
                return await operation();
            } catch (error) {
                handleError(error, operationName);
                return null;
            }
        },
        [handleError]
    );

    return {
        handleError,
        executeWithErrorHandling,
    };
}
