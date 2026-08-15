"use client";
import { useEffect } from "react";

const avatarSelector = '[class$="-user"]>i,.profile>.avatar';
const triggerSelector = `${avatarSelector},.profile`;

export function ProfilePhotoProvider() {
  useEffect(() => {
    const apply = () => {
      const photo = localStorage.getItem("monteiro-profile-photo") || "";
      document.documentElement.style.setProperty("--crm-profile-photo", photo ? `url(${photo})` : "none");
      document.querySelectorAll<HTMLElement>(avatarSelector).forEach((avatar) => {
        avatar.dataset.profileAvatar = "true";
        avatar.style.color = photo ? "transparent" : "";
        avatar.title = "Clique para alterar sua foto";
      });
    };
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.hidden = true;
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 256; canvas.height = 256;
        const context = canvas.getContext("2d");
        if (!context) return;
        const scale = Math.max(256 / image.width, 256 / image.height);
        const width = image.width * scale, height = image.height * scale;
        context.drawImage(image, (256 - width) / 2, (256 - height) / 2, width, height);
        try {
          localStorage.setItem("monteiro-profile-photo", canvas.toDataURL("image/jpeg", .82));
        } catch {
          canvas.width = 160; canvas.height = 160;
          const retry = canvas.getContext("2d");
          if (retry) retry.drawImage(image, 0, 0, 160, 160);
          localStorage.setItem("monteiro-profile-photo", canvas.toDataURL("image/jpeg", .72));
        }
        apply();
      };
      image.src = URL.createObjectURL(file);
    };
    const click = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(triggerSelector);
      if (target) input.click();
    };
    document.addEventListener("click", click);
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    apply();
    return () => { observer.disconnect(); document.removeEventListener("click", click); input.remove(); };
  }, []);
  return null;
}
