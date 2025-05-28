import { internalMutation } from "./_generated/server";

    // This internal mutation does the actual work of generating the upload URL.
    // It can be called by actions from any environment (node or v8).
    export const generateUploadUrlInternal = internalMutation({
      handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
      },
    });
