import { useEffect, useRef, useState } from "react";
import { Checkbox, Segmented, Select, TextArea, TextField } from "../components/Controls";
import { LogoMark } from "../components/LogoMark";
import { openMenuAt } from "../components/MenuHost";
import { FileTile } from "../components/Visuals";
import { WindowFrame } from "../components/WindowFrame";
import { ZipContents } from "../components/ZipContents";
import { Icon } from "../design/icons";
import { patchSettings } from "../lib/actions";
import { api, onCoreEvent } from "../lib/api";
import { formatBytes, hostOf } from "../lib/format";
import { t } from "../lib/i18n";
import { folderFor } from "../lib/paths";
import { categoryIcon, displayName } from "../lib/present";
import { useApp } from "../lib/store";
import type { CaptureInfo, ConflictAction, StartMode } from "../lib/types";
import { attempt } from "../lib/ui";
import { copyText, pickFolder, win } from "../lib/win";

const ZIP_TYPES = new Set(["application/zip", "application/x-zip-compressed", "application/x-zip"]);

/** A ZIP over HTTP(S): its list of files can be read before downloading it. */
const isZip = (c: CaptureInfo) => c.kind === "http" && (/\.zip$/i.test(c.fileName) || ZIP_TYPES.has((c.mime ?? "").split(";")[0].trim().toLowerCase()));

export default function CaptureWindow({ id }: { id: string }) {
  const [cap, setCap] = useState<CaptureInfo | null>(null);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [dir, setDir] = useState("");
  const [category, setCategory] = useState("");
  const [desc, setDesc] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [conflict, setConflict] = useState<"rename" | "overwrite">("rename");
  const [dupConflict, setDupConflict] = useState<ConflictAction>("resume");
  const [dupResolved, setDupResolved] = useState(false);
  const [rememberDup, setRememberDup] = useState(false);
  const [remember, setRemember] = useState(false);
  const [more, setMore] = useState(true);
  const [free, setFree] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const touched = useRef({ name: false, dir: false, category: false });
  const categories = useApp((s) => s.categories);
  const queues = useApp((s) => s.queues);
  const defaultConflict = useApp((s) => s.settings?.downloads.conflict ?? "ask");

  const apply = (c: CaptureInfo) => {
    setCap(c);
    if (!touched.current.name) setName(c.fileName);
    if (!touched.current.category) setCategory(c.category);
    if (!touched.current.dir) setDir(c.saveDir);
    setDesc((d) => d || c.description);
  };

  useEffect(() => {
    void api.getCapture(id).then((c) => (c ? apply(c) : setMissing(true)), () => setMissing(true));
    let off: (() => void) | undefined;
    void onCoreEvent((e) => {
      if (e.type === "captureUpdated" && e.payload.id === id) apply(e.payload);
    }).then((u) => (off = u));
    return () => off?.();
  }, [id]);

  useEffect(() => {
    if (!dir) return;
    const timer = window.setTimeout(() => void api.freeSpace(dir).then(setFree, () => setFree(null)), 250);
    return () => window.clearTimeout(timer);
  }, [dir]);

  const close = () => void win.close();
  const cancel = () => {
    void api.cancelCapture(id);
    close();
  };
  const confirm = async (mode: StartMode, overrideConflict?: ConflictAction) => {
    if (!cap) return;
    setBusy(true);
    const chosenConflict =
      overrideConflict ??
      (cap.duplicateId && dupResolved
        ? dupConflict
        : cap.exists
          ? conflict
          : defaultConflict !== "ask"
            ? defaultConflict
            : undefined);
    const item = await attempt(
      api.confirmCapture({
        id,
        mode,
        fileName: name.trim() || cap.fileName,
        saveDir: dir,
        category,
        description: desc,
        username: user || undefined,
        password: pass || undefined,
        rememberDir: remember,
        conflict: chosenConflict === "ask" ? "rename" : chosenConflict,
      }),
      t("Could not add the download"),
    );
    setBusy(false);
    if (item) close();
  };

  if (missing)
    return (
      <WindowFrame kind="capture" title={t("Download file")}>
        <div className="wempty">
          <Icon name="info" size={22} />
          <p>{t("This download was already handled or cancelled.")}</p>
          <button type="button" className="btn" onClick={close}>
            {t("Close")}
          </button>
        </div>
      </WindowFrame>
    );

  const isDuplicate = Boolean(cap?.duplicateId);
  const showDuplicateDialog = isDuplicate && !dupResolved && defaultConflict === "ask";

  if (showDuplicateDialog && cap) {
    const handleDuplicateOk = async () => {
      if (rememberDup) {
        await patchSettings({ downloads: { conflict: dupConflict } });
      }
      if (dupConflict === "resume") {
        await confirm({ type: "now" }, "resume");
      } else {
        if (dupConflict === "overwrite" || dupConflict === "rename") {
          setConflict(dupConflict);
        }
        setDupResolved(true);
      }
    };

    return (
      <WindowFrame
        kind="capture"
        title={t("Duplicate download link")}
        icon={<LogoMark size={18} glass="indigo" />}
        onClose={cancel}
        className="capture capture--duplicate"
      >
        <div className="wbody idm-dup">
          <div className="idm-dup__url selectable t-mono" title={cap.url}>
            {cap.url}
          </div>

          <p className="idm-dup__lead">
            {t(
              "This file already exists in your download list. You may choose one of the following options, or press Cancel button to skip the download of this file",
            )}
          </p>

          <div className="idm-dup__radios" role="radiogroup" aria-label={t("Duplicate download options")}>
            <label className={`idm-radio ${dupConflict === "rename" ? "is-on" : ""}`} onClick={() => setDupConflict("rename")}>
              <span className="idm-radio__dot" />
              <span>{t("Add the duplicate with a numbered file name")}</span>
            </label>
            <label className={`idm-radio ${dupConflict === "overwrite" ? "is-on" : ""}`} onClick={() => setDupConflict("overwrite")}>
              <span className="idm-radio__dot" />
              <span>{t("Add the duplicate and overwrite the existing file")}</span>
            </label>
            <label className={`idm-radio ${dupConflict === "resume" ? "is-on" : ""}`} onClick={() => setDupConflict("resume")}>
              <span className="idm-radio__dot" />
              <span>{t("If existing file is complete, show download complete dialog; otherwise resume it.")}</span>
            </label>
          </div>

          <div className="idm-dup__actions">
            <button type="button" className="btn btn--primary idm-dup__btn" autoFocus disabled={busy} onClick={() => void handleDuplicateOk()}>
              {t("OK")}
            </button>
            <button type="button" className="btn idm-dup__btn" disabled={busy} onClick={cancel}>
              {t("Cancel")}
            </button>
          </div>

          <div className="idm-dup__remember">
            <Checkbox checked={rememberDup} onChange={setRememberDup}>
              <span>
                {t("Remember my selection and don't show this dialog again.")}
                <br />
                <small className="text-tertiary">
                  {t("You may change it in JDM Settings -> Downloads at a later time.")}
                </small>
              </span>
            </Checkbox>
          </div>
        </div>
      </WindowFrame>
    );
  }

  const lowSpace = cap?.size != null && free != null && free < cap.size;

  return (
    <WindowFrame kind="capture" title={t("Download file")} icon={<LogoMark size={18} glass="indigo" />} onClose={cancel} className="capture">
      <div className="wbody">
        <div className="field">
          <span className="field__label">{t("Address")}</span>
          <div className="withbtn">
            <div className="input input--readonly">
              <Icon name="link" size={15} />
              <span className="input__value t-mono selectable" title={cap?.url}>
                {cap?.url ?? "…"}
              </span>
            </div>
            <button type="button" className="btn btn--icon" aria-label={t("Copy address")} data-tip={t("Copy address")} onClick={() => cap && void copyText(cap.url)}>
              <Icon name="copy" size={15} />
            </button>
          </div>
        </div>

        <div className="filecard">
          {cap ? <FileTile item={{ fileName: name || cap.fileName, kind: cap.kind, category, media: null }} size={44} /> : <span className="file-tile" style={{ width: 44, height: 44 }} />}
          <div className="grow">
            <input
              className="fname"
              value={name}
              aria-label={t("File name")}
              spellCheck={false}
              onChange={(e) => {
                touched.current.name = true;
                setName(e.target.value);
              }}
            />
            <div className="tags">
              {cap?.probing ? (
                <span className="badge badge--accent">
                  <Icon name="retry" size={11} strokeWidth={2.2} className="anim-spin" /> {t("Checking…")}
                </span>
              ) : cap?.probeError ? (
                <span className="badge badge--danger" data-tip={cap.probeError}>
                  <Icon name="status-error" size={11} strokeWidth={2.2} /> {cap.probeError.length > 36 ? `${cap.probeError.slice(0, 36)}…` : cap.probeError}
                </span>
              ) : cap?.resumable ? (
                <span className="badge badge--success">
                  <Icon name="check" size={11} strokeWidth={2.4} /> {t("Resumable")}
                </span>
              ) : cap ? (
                <span className="badge badge--warning" data-tip={t("The server does not support ranges: one connection, restarts from zero if interrupted")}>
                  <Icon name="warning" size={11} strokeWidth={2.2} /> {t("Not resumable")}
                </span>
              ) : null}
              {cap?.mime && <span className="badge">{cap.mime.split(";")[0]}</span>}
              {cap && <span className="badge">{hostOf(cap.finalUrl || cap.url) || cap.kind.toUpperCase()}</span>}
            </div>
          </div>
          <div className="big tnum">
            {cap?.probing && cap.size == null ? "…" : cap?.size == null ? t("N/A") : formatBytes(cap.size)}
            <small className={lowSpace ? "text-danger" : undefined}>{free != null ? t("{size} free", { size: formatBytes(free) }) : ""}</small>
          </div>
        </div>

        {cap && isZip(cap) && cap.resumable && <ZipContents captureId={id} dir={dir} />}

        {cap?.needsAuth && (
          <div className="authbox">
            <Icon name="lock-closed" size={16} className="text-warning" />
            <TextField value={user} onChange={setUser} label={t("User name")} placeholder={t("User name")} icon="user" />
            <TextField value={pass} onChange={setPass} label={t("Password")} placeholder={t("Password")} type="password" icon="key" onEnter={() => void api.reprobeCapture(id, user, pass)} />
            <button type="button" className="btn" onClick={() => void attempt(api.reprobeCapture(id, user, pass), t("Could not retry"))}>
              {t("Retry")}
            </button>
          </div>
        )}

        {cap?.exists && (
          <div className="conflict">
            <Icon name="warning" size={16} className="text-warning" />
            <span>{t("A file with this name already exists.")}</span>
            <Segmented
              size="sm"
              label={t("When the file exists")}
              value={conflict}
              onChange={setConflict}
              options={[
                { value: "rename", label: t("Keep both") },
                { value: "overwrite", label: t("Overwrite") },
              ]}
            />
          </div>
        )}

        <div className="row-save">
          <div className="field">
            <span className="field__label">{t("Save to")}</span>
            <div className="withbtn">
              <TextField
                value={dir}
                onChange={(v) => {
                  touched.current.dir = true;
                  setDir(v);
                }}
                icon="folder"
                label={t("Save folder")}
              />
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const p = await pickFolder(dir);
                  if (p) {
                    touched.current.dir = true;
                    setDir(p);
                  }
                }}
              >
                {t("Browse…")}
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field__label">{t("Category")}</span>
            <Select
              label={t("Category")}
              value={category}
              onChange={(v) => {
                touched.current.category = true;
                setCategory(v);
                if (!touched.current.dir) setDir(folderFor(v, dir));
              }}
              options={categories.map((c) => ({ value: c.id, label: displayName(c.name), icon: categoryIcon(c) }))}
            />
          </div>
        </div>

        <div className="checks">
          <Checkbox checked={remember} onChange={setRemember}>
            {t("Remember this folder for {category}", { category: displayName(categories.find((c) => c.id === category)?.name ?? "") || t("this category") })}
          </Checkbox>
          <button type="button" className="disclose" aria-expanded={more} onClick={() => setMore(!more)}>
            <Icon name={more ? "chevron-down" : "chevron-right"} size={12} strokeWidth={2.2} /> {t("Description")}
          </button>
        </div>
        {more && <TextArea value={desc} onChange={setDesc} label={t("Description")} placeholder={t("Optional note shown in the list")} />}
      </div>

      <footer className="dialog__footer">
        <div className="split">
          <button type="button" className="btn" disabled={!cap || busy} onClick={() => confirm({ type: "later" })}>
            <Icon name="status-scheduled" size={15} /> {t("Download later")}
          </button>
          <button
            type="button"
            className="btn"
            aria-label={t("More start options")}
            disabled={!cap || busy}
            onClick={(e) =>
              openMenuAt(e.currentTarget, [
                { label: t("Download later"), icon: "status-scheduled", onSelect: () => void confirm({ type: "later" }) },
                { label: t("Add to queue"), icon: "queue", submenu: queues.map((q) => ({ label: displayName(q.name), icon: q.running ? "start-queue" : "queue", onSelect: () => void confirm({ type: "queue", queueId: q.id }) })) },
              ])
            }
          >
            <Icon name="chevron-down" size={13} strokeWidth={2.2} />
          </button>
        </div>
        <span className="spacer" />
        <button type="button" className="btn btn--ghost" onClick={cancel}>
          {t("Cancel")}
        </button>
        <button type="button" className="btn btn--primary" disabled={!cap || busy || lowSpace} onClick={() => confirm({ type: "now" })} data-tip={lowSpace ? t("Not enough free space") : undefined}>
          <Icon name="download" size={15} /> {t("Start download")}
        </button>
      </footer>
    </WindowFrame>
  );
}
