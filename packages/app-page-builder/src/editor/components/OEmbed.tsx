import React, { useCallback, useEffect, ReactElement, useState } from "react";
import gql from "graphql-tag";
import { css } from "emotion";
import { useQuery } from "react-apollo";
import { useSnackbar } from "@webiny/app-admin/hooks/useSnackbar";
import { Typography } from "@webiny/ui/Typography";
import { useEventActionHandler } from "@webiny/app-page-builder/editor/hooks/useEventActionHandler";
import { UpdateElementActionEvent } from "@webiny/app-page-builder/editor/recoil/actions";
import { PbEditorElement } from "@webiny/app-page-builder/types";
import useRenderEmptyEmbed from "../plugins/elements/utils/oembed/useRenderEmptyEmbed";

function appendSDK(props) {
    const { sdk, global, element } = props;
    const { url } = element?.data?.source || {};

    if (!sdk || !url || window[global]) {
        return Promise.resolve();
    }

    return new Promise(resolve => {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = encodeURI(sdk);
        script.setAttribute("async", "");
        script.setAttribute("charset", "utf-8");
        script.onload = resolve;
        document.body.appendChild(script);
    });
}

function initEmbed(props) {
    const { sdk, init, element } = props;
    if (sdk && element?.data?.source?.url) {
        const node = document.getElementById(element.id);
        if (typeof init === "function" && node) {
            init({ props, node });
        }
    }
}

const oembedQuery = gql`
    query GetOEmbedData($url: String!, $width: String, $height: String) {
        pageBuilder {
            oembedData(url: $url, width: $width, height: $height) {
                data
                error {
                    code
                    message
                }
            }
        }
    }
`;

const centerAlign = css({
    "*:first-of-type": {
        marginLeft: "auto !important",
        marginRight: "auto !important"
    }
});

const errorElementStyle = css({
    color: "var(--mdc-theme-text-primary-on-background)",
    "& .component-name": {
        fontWeight: "bold"
    }
});

export type OEmbedProps = {
    element: PbEditorElement;
    onData?: (data: { [key: string]: any }) => { [key: string]: any };
    renderEmbed?: (props: OEmbedProps) => ReactElement;
    data?: any;
};
const OEmbedComponent = (props: OEmbedProps) => {
    const [errorMessage, setErrorMessage] = useState(null);
    const eventActionHandler = useEventActionHandler();
    const { showSnackbar } = useSnackbar();
    const { element, onData = d => d } = props;

    useEffect(() => {
        appendSDK(props).then(() => initEmbed(props));
    });

    const source = element.data.source || {};
    const oembed = element.data.oembed || {};
    const sourceUrl = source.url;
    const oembedSourceUrl = oembed.source?.url;

    const skip = !sourceUrl || sourceUrl === oembedSourceUrl;

    const { loading } = useQuery(oembedQuery, {
        skip,
        variables: source,
        onCompleted: data => {
            if (skip) {
                return;
            }
            const { data: oembed, error } = data.pageBuilder.oembedData || {};
            if (oembed) {
                const newElement: PbEditorElement = {
                    ...element,
                    data: {
                        ...element.data,
                        oembed: onData(oembed)
                    }
                };
                eventActionHandler.trigger(
                    new UpdateElementActionEvent({
                        element: newElement,
                        history: true
                    })
                );
            }
            if (error) {
                setErrorMessage(error.message);
                showSnackbar(error.message);
            }
        }
    });

    const renderEmpty = useRenderEmptyEmbed(element);

    const renderEmbed = useCallback(
        (targetElement: PbEditorElement, isLoading: boolean) => {
            if (typeof props.renderEmbed === "function") {
                return props.renderEmbed(props);
            }

            if (isLoading) {
                return <div>Loading embed data...</div>;
            }
            if (errorMessage) {
                return (
                    <details className={errorElementStyle}>
                        <summary>
                            <Typography use={"overline"}>
                                We couldn&apos;t embed your{" "}
                                <span className={"component-name"}>{element.type}</span> URL! See
                                the detailed error below.
                            </Typography>
                        </summary>
                        <Typography use={"body2"}>{errorMessage}</Typography>
                    </details>
                );
            }
            return (
                <div
                    id={targetElement.id}
                    className={
                        centerAlign + " pb-editor-dragging--disabled pb-editor-resizing--disabled"
                    }
                    dangerouslySetInnerHTML={{ __html: targetElement.data?.oembed?.html || "" }}
                />
            );
        },
        [element, loading, errorMessage]
    );

    return sourceUrl ? renderEmbed(element, loading) : renderEmpty();
};
export default React.memo(OEmbedComponent);
