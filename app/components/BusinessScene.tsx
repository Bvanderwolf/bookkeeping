import { sectorsForLanguage } from "../domain/accounts";
import { useI18n } from "../i18n";
import type { CompanyProfile } from "../domain/types";
import styles from "./components.module.css";

export function BusinessScene({
  profile,
  growthDays,
  message,
  compact = false,
}: {
  profile: CompanyProfile;
  growthDays: number;
  message?: string;
  compact?: boolean;
}) {
  const { language, t } = useI18n();
  const sectors = sectorsForLanguage(language);
  const sector = sectors.find((item) => item.id === profile.sectorId) ?? sectors[0];
  const tier = growthDays >= 8 ? 3 : growthDays >= 3 ? 2 : 1;

  return (
    <figure className={`${styles.scene} ${compact ? styles.sceneCompact : ""}`}>
      <img src={sector.image} alt={t("Pixelinterieur van {{sector}}", { sector: sector.shortLabel })} />
      <figcaption>
        <span className={styles.sceneName}>{profile.name}</span>
        <span className={styles.sceneLevel}>{t("Groeifase {{tier}} van 3", { tier })}</span>
      </figcaption>
      {message && <div className={styles.sceneMessage}>{message}</div>}
    </figure>
  );
}
