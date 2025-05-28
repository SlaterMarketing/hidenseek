"use node";
    import { action, internalAction } from "./_generated/server";
    import { internal } from "./_generated/api";

    // This is an action because it might be called from a "use node" environment
    // if other Node.js specific APIs were to be added to this file in the future.
    // Actions call internal mutations to interact with storage or database.
    export const actionGenerateUploadUrl = action({
      handler: async (ctx) => {
        // Call an internal action which then calls an internal mutation in a non-node file
        const uploadUrl: string = await ctx.runAction(internal.files.internalActionGenerateUploadUrl);
        return uploadUrl;
      },
    });

    // This internal action calls an internalMutation in a separate file to generate the upload URL.
    export const internalActionGenerateUploadUrl = internalAction({
      handler: async (ctx) => {
        const uploadUrl: string = await ctx.runMutation(internal.storage.generateUploadUrlInternal);
        return uploadUrl;
      },
    });
