/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { useEffect, useState, React, ReactDOM, useRef, EmojiStore, GuildStore } from "@webpack/common";
import "./index.css";
import { Message } from "discord-types/general";
import { findByPropsLazy } from "@webpack";
import { classes } from "@utils/misc";

function romanize(num: number) {
    if (num === undefined) return;
    if (isNaN(num)) return NaN;
    let digits = String(+num).split(""),
        key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
            "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
            "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
        roman = "",
        i = 3;
    while (i--)
        roman = (key[+digits.pop()! + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
}
const maxExtLength = 6,
    extWhitelist = ["properties", "keychain", "numbers", "workflow", "component", "sublime-project", "dictionary", "savedsearch", "strings", "xcworkspace", "xcodeproj", "prefpane", "qlgenerator", "mdimporter", "deskthemepack", "library-ms", "searchconnector-ms", "appref-ms", "website", "contact", "sparseimage", "sparsebundle", "mobileprovision", "xcassets", "xcconfig", "stringsdict", "xcdatamodeld", "xcmappingmodel", "photoslibrary", "vcxproj", "application", "manifest", "appxbundle", "msixbundle", "settings", "inetloc", "terminal", "webarchive", "entitlements", "scriptsuite", "scriptterminology", "doccarchive", "playground", "markdown", "textile", "fountain", "asciidoc", "gslides", "webmanifest", "sublime-settings", "service", "socket", "network", "automount", "flatpakref", "flatpakrepo", "appimage", "squashfs", "luarc", "gnumeric"];

function parseExtensions(filename: string) {
    let good: string[] = [],
        bad: string[] = [],
        extensions: string[] = filename.split("."),
        nvm = false;

    for (const ext of (extensions.shift(), extensions.reverse())) {
        if (nvm || (!extWhitelist.includes(ext.toLowerCase()) && (ext === "" || ext.match(/^\d/) || ext.length > maxExtLength))) {
            bad.push(ext);
            nvm = true;
            continue;
        }
        good.unshift(ext);
    }
    return [good.reverse(), bad.reverse()];
}
function formatLength(seconds) {
    const totalSeconds = Math.floor(seconds);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const remaining = seconds - totalSeconds;

    const timeStr = [hours, minutes, secs].map(a => a.toString().padStart(2, '0')).join(':');


    return timeStr + (remaining > 0 ? '.' + remaining.toFixed(3).split('.')[1] : "");
}

const MineTooltip = function MineTooltip({ children, setCumRef, top, left, ...props }) {
    return (
        <div id="minetip-tooltip" ref={setCumRef} {...props} style={{ top, left, ...props.style }}>
            {typeof children == "string" ? <span className="minetip-title">{children}</span> : children}
        </div>
    );
};
const format = findByPropsLazy("humanize", "filesize");
interface Elem {
    color: "magenta" | "aqua" | "blue" | "yellow" | "gray" | "dark-gray";
    text?: string;
    noBreak?: boolean;
    label?: boolean;
    italic?: boolean;
}
interface CraftyMousePopoutProps {
    shiftState: [boolean?, ((state: boolean) => void)?];
    ctrlState: [boolean?, ((state: boolean) => void)?];
    initialPos: { x?: number; y?: number; };
    texts: (Elem | React.ReactElement)[];
}

function CraftyMousePopout({ shiftState: [shiftHeld, setShiftHeld], ctrlState: [ctrlHeld, setCtrlHeld], initialPos, texts, ...props }: CraftyMousePopoutProps) {
    const [posX, setPosX] = useState((initialPos?.x ?? 0) + 25);
    const [posY, setPosY] = useState((initialPos?.y ?? 0) - 32);
    const cumRef = useRef<any>(null);

    let rect = cumRef.current?.getBoundingClientRect?.();
    useEffect(() => {
        const onmousemove = (e: MouseEvent) => {
            if (!rect) rect = cumRef.current?.getBoundingClientRect?.();
            const documeRect = document.body.getBoundingClientRect?.();
            let x = e.x + 25;
            let y = e.y - 32; // e.y - (rect.height / 2) // for being centerred on the cursor instead of a minecrap-like offset, maybe add as a setting later
            if (x + rect.width > documeRect.width)
                x = e.x - 25 - rect.width;
            if (y + rect.height > documeRect.height)
                y = documeRect.height - rect.height;
            setPosX(x);
            setPosY(y);
            if (setShiftHeld && shiftHeld !== e.shiftKey)
                setShiftHeld(e.shiftKey);
            if (setCtrlHeld && ctrlHeld !== e.ctrlKey)
                setCtrlHeld(e.ctrlKey);
        };
        const onkey = (e: KeyboardEvent) => {
            setShiftHeld?.(e.shiftKey && e.type === "keydown");
            setCtrlHeld?.(e.ctrlKey && e.type === "keydown");
        };
        document.body.addEventListener("mousemove", onmousemove);
        if (setShiftHeld || setCtrlHeld) {
            document.body.addEventListener("keydown", onkey);
            document.body.addEventListener("keyup", onkey);
        }
        return () => {
            document.body.removeEventListener("mousemove", onmousemove);
            if (setShiftHeld || setCtrlHeld) {
                document.body.removeEventListener("keydown", onkey);
                document.body.removeEventListener("keyup", onkey);
            }
        };
    }, []);
    const parsed: React.ReactElement[] = [];
    for (let i = 0; i < texts.length; i++) {
        const elem = texts[i];
        if (!("noBreak" in elem && elem?.noBreak) && i !== 0 && i !== texts.length && !(React.isValidElement(elem) && elem.type === 'br')) parsed.push(<br />);
        if (React.isValidElement<any>(elem)) {
            parsed.push(elem as React.ReactElement);
            continue;
        }
        parsed.push(
            ((elem.text && (elem.text.length > 0))
                ? <span className={classes(elem.color && ("mc-" + elem.color), elem.italic && "mc-italic", elem.label && "label")}>{elem.text}</span>
                : <span>???</span>)
        );
    }
    return (
        <MineTooltip setCumRef={ref => cumRef.current = ref} top={posY} left={posX} {...props}>
            {parsed}
        </MineTooltip>
    );
}


export default definePlugin({
    name: "Minetada",
    description: "Shows minecraft-ish tooltips on attachments/emojis",
    authors: [{
        name: "fres",
        id: 843448897737064448n
    }, {
        name: "meqa",
        id: 744276454946242723n
    }],

    patches: [
        // {
        // 	find: "focusTarget:this._clickableRef",
        // 	replacement: {
        // 		match: /(?<=children:\(.{0,10}jsxs\)\()"div"/,
        // 		replace: "$self.uwu"
        // 	}
        // },
        {
            find: ".gifFavoriteButton,children",
            replacement: {
                match: /(?<={let{props:(\i),.{0,500})(?<=return.{0,20}\)\()(\i\.?\i\.Provider),{/,
                replace: "$self.attachmentTooltip,{Original:$2,vencordData:$1,"
            }
        },
        {
            find: ".jumboable?",
            replacement: [{
                match: /(?<=let{node:(\i),.{0,1000})shouldShow:.{0,5}(,.{0,100}CustomEmojiTooltipShown.{0,500})tag:"span"/,
                replace: "shouldShow:false$2tag:$self.emojiTooltip,vcEmoji:$1"
            },
            {
                match: /shouldShow:.{0,5},(.{0,50}emojiNode:(\w),.{0,500}tag:)"span"/,
                replace: "shouldShow:false,$1$self.emojiTooltip,vcEmoji:$2"
            }]
        }
    ],

    emojiTooltip({ vcEmoji, ...props }) {
        const [shouldShowOverlay, setShouldShowOverlay] = useState(false);
        const [ctrlHeld, setCtrlHeld] = useState(false);
        const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
        // const [fetchedSource, setFetchedSource] = useState(null); TODO fetch source. optionally keep a cache
        function onMouseEnter(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
            console.log("Hovered item:", vcEmoji);
            setInitialPos({ x: event.pageX, y: event.pageY });
            setShouldShowOverlay(true);
        }
        function onMouseLeave() {
            console.log("gone");
            setShouldShowOverlay(false);
        }
        const texts: (Elem | React.ReactElement)[] = [];
        let emjo = vcEmoji.name.slice(1, -1).split("~");
        texts.push({
            color: "yellow",
            text: emjo[0]
        });
        if (emjo[1]) texts.push({
            noBreak: true,
            color: "dark-gray",
            text: "~" + emjo[1]
        });
        const source = vcEmoji.type == "customEmoji" ? (() => {
            const emoji = EmojiStore.getCustomEmojiById(vcEmoji.emojiId);
            const guild = GuildStore.getGuild(emoji?.guildId);
            return guild?.name ?? "Unknown ";
        })() : "Discord ";
        texts.push(<br />, {
            color: "blue",
            italic: true,
            text: source
        });
        return (
            <>
                <span {...props} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
                {shouldShowOverlay && ReactDOM.createPortal(
                    ctrlHeld ? <></> : <CraftyMousePopout
                        ctrlState={[ctrlHeld, setCtrlHeld]}
                        shiftState={[]}
                        initialPos={initialPos}
                        texts={texts}
                    />,
                    document.body)}
            </>
        );
    },

    attachmentTooltip({ Original, vencordData, ...props }: { Original: any, vencordData: { message: Message, item: any; }, props: any; }) {
        const [shouldShowOverlay, setShouldShowOverlay] = useState(false);
        const [shiftHeld, setShiftHeld] = useState(false);
        const [ctrlHeld, setCtrlHeld] = useState(false);
        const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
        function onMouseEnter(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
            console.log("Hovered item:", vencordData);
            setShiftHeld(event.shiftKey);
            setCtrlHeld(event.ctrlKey);
            setInitialPos({ x: event.pageX, y: event.pageY });
            setShouldShowOverlay(true);
        }
        function onMouseLeave() {
            console.log("gone");
            setShiftHeld(false);
            setCtrlHeld(false);
            setShouldShowOverlay(false);
        }

        const texts: (Elem | React.ReactElement)[] = [];

        const meta = vencordData.item.originalItem;
        let flags = {
            "Clip": (meta.flags & (1 << 0)) !== 0,
            "Thumbnail": (meta.flags & (1 << 1)) !== 0,
            "Remix": (meta.flags & (1 << 2)) !== 0,
            "Spoiler": (meta.flags & (1 << 3)) !== 0,
            "Explicit": (meta.flags & (1 << 4)) !== 0,
            "Animated": (meta.flags & (1 << 5)) !== 0,
            // uppercase in the beginning of the key due to it being used as part of the message, probably will have to change later for translations
        };

        let filename = meta.filename;
        let filetypeText: string[] = [];

        if (meta.content_type) {
            const contentTypeParts = meta.content_type.split(';');
            filetypeText.push(contentTypeParts[0]);
            if (contentTypeParts.length > 1) {
                filetypeText.push(` (${contentTypeParts[1].trim()})`);
            }
        }
        if (meta.filename && !shiftHeld) {
            const filenameParts = filename.split('.');
            if (filenameParts.length > 1) {
                const [validExts, invalidExts] = parseExtensions(meta.filename);
                if (validExts.length > 0) {
                    filetypeText.push(`[.${validExts.join('.')}]`);
                }
                filename = [filenameParts[0], ...invalidExts].join('.');
            }
        }
        if (!shiftHeld) {
            filename = filename.split(".").join(' ').split('_').filter(e => !e.startsWith("SPOILER")).filter(e => !e.match(/^.E\d$/)).join(' ').replace(/^\d+px-/g, '');
        }
        texts.push({
            color: "aqua",
            text: filename
        }, <br />, {
            color: "gray",
            text: `Size ${format.filesize(meta.size)}`
        });
        if (meta.duration_secs !== undefined) texts.push({
            color: "gray",
            text: `Length ${formatLength(meta.duration_secs)}`
        });
        if (meta.width !== undefined) texts.push({
            color: "gray",
            text: `Width ${romanize(meta?.width)}`
        });
        if (meta.height !== undefined) texts.push({
            color: "gray",
            text: `Height ${romanize(meta?.height)}`
        });
        if (Object.keys(flags).some(f => flags[f])) {
            texts.push(<br />);
            texts.push({ color: "gray", text: "Metadata:" });
            for (const key of Object.keys(flags)) if (flags[key]) texts.push({
                color: "blue",
                text: `+1 ${key}`
            });
        }
        if (meta.description) texts.push(<br />, {
            color: "magenta",
            text: meta.description,
            label: true
        });
        if (filetypeText.join(" ")) texts.push({
            color: "dark-gray",
            text: `${filetypeText.join(" ")}`,
        });
        return (
            <>
                <span {...props} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
                {shouldShowOverlay && ReactDOM.createPortal(
                    ctrlHeld ? <></> : <CraftyMousePopout
                        ctrlState={[ctrlHeld, setCtrlHeld]}
                        shiftState={[shiftHeld, setShiftHeld]}
                        initialPos={initialPos}
                        texts={texts}
                    />,
                    document.body)}
            </>
        );
    }
});
