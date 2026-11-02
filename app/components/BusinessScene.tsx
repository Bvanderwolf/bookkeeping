import { SECTORS } from "../domain/accounts";
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
  const sector = SECTORS.find((item) => item.id === profile.sectorId) ?? SECTORS[0];
  const tier = growthDays >= 8 ? 3 : growthDays >= 3 ? 2 : 1;

  return (
    <figure className={`${styles.scene} ${compact ? styles.sceneCompact : ""}`}>
      <img src={sector.image} alt={`Pixelinterieur van ${sector.shortLabel}`} />
      <figcaption>
        <span className={styles.sceneName}>{profile.name}</span>
        <span className={styles.sceneLevel}>Groeifase {tier} van 3</span>
      </figcaption>
      {message && <div className={styles.sceneMessage}>{message}</div>}
    </figure>
  );
}
