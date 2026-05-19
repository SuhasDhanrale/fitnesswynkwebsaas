import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.wrapper}>
      {/* Stat cards skeleton */}
      <div className={styles.grid4}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.statCard}`} />
        ))}
      </div>

      {/* Buttons row skeleton */}
      <div className={styles.grid4}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.btnCard}`} />
        ))}
      </div>

      {/* Content rows skeleton */}
      <div className={styles.grid2}>
        <div className={`${styles.skeleton} ${styles.tall}`} />
        <div className={`${styles.skeleton} ${styles.tall}`} />
      </div>
    </div>
  );
}
