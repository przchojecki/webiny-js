import { ErrorResponse, Response } from "@webiny/handler-graphql";
import { CmsContext } from "@webiny/api-headless-cms/types";

export default {
    typeDefs: /* GraphQL */ `
        type SystemUpgradeResponse {
            plugins: JSON
            results: JSON
        }
        extend type CmsQuery {
            # Is CMS installed?
            isInstalled: CmsBooleanResponse
            # Is system upgrade available?
            isSystemUpgradeAvailable: CmsBooleanResponse!
        }

        extend type CmsMutation {
            # Install CMS
            install: CmsBooleanResponse
            # Upgrade this system
            systemUpgrade: SystemUpgradeResponse!
        }
    `,
    resolvers: {
        CmsQuery: {
            isInstalled: async (_, __, context: CmsContext) => {
                try {
                    // we are disabling auth here because we only require isInstalled flag
                    const settings = await context.cms.settings.noAuth().get();
                    return new Response(!!settings?.isInstalled);
                } catch (e) {
                    return new ErrorResponse(e);
                }
            },
            isSystemUpgradeAvailable: async (_, __, context: CmsContext) => {
                try {
                    const upgradeable = await context.cms.settings.isSystemUpgradeAvailable();
                    return new Response(!!upgradeable);
                } catch (e) {
                    return new ErrorResponse(e);
                }
            }
        },
        CmsMutation: {
            install: async (_, __, { cms }: CmsContext) => {
                try {
                    await cms.settings.install();
                    return new Response(true);
                } catch (e) {
                    return new ErrorResponse(e);
                }
            },
            systemUpgrade: async (_, __, context: CmsContext) => {
                try {
                    const result = await context.cms.settings.systemUpgrade();
                    return new Response(result);
                } catch (e) {
                    return new ErrorResponse(e);
                }
            }
        }
    }
};
