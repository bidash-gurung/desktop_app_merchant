// src/tabs/components/additems/ImageField.jsx
import React from "react";

function niceSize(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export default function ImageField({ value, onChange, disabled }) {
  const [previewUrl, setPreviewUrl] = React.useState("");

  React.useEffect(() => {
    if (!value) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function pickFile(file) {
    if (!file) return;
    onChange?.(file);
  }

  return (
    <div className="aiImgWrap">
      <div className={`aiImgBox ${previewUrl ? "has" : ""}`}>
        {previewUrl ? (
          <img className="aiImgPreview" src={previewUrl} alt="Item" />
        ) : (
          <div className="aiImgEmpty">
            <div className="aiImgEmptyTitle">Upload item image</div>
            <div className="aiImgEmptySub">PNG / JPG / WEBP</div>
          </div>
        )}
      </div>

      <div className="aiImgBar">
        <label className={`aiFileBtn ${disabled ? "disabled" : ""}`}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            disabled={disabled}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          Choose image
        </label>

        {value ? (
          <>
            <div className="aiImgMeta" title={value.name}>
              <div className="aiImgName">{value.name}</div>
              <div className="aiImgSize">{niceSize(value.size)}</div>
            </div>

            <button
              type="button"
              className="aiMiniBtn"
              disabled={disabled}
              onClick={() => onChange?.(null)}
              title="Remove image"
            >
              Remove
            </button>
          </>
        ) : (
          <div className="aiImgMeta muted">No image selected</div>
        )}
      </div>
    </div>
  );
}
