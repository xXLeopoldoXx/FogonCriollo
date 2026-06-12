import { motion } from 'framer-motion';
import styles from './ContadorEstados.module.css';

export function ContadorEstados({ contadores }) {
  const items = [
    { label: 'Nuevos',     value: contadores.pendiente,  cls: 'pendiente' },
    { label: 'En proceso', value: contadores.en_proceso, cls: 'proceso'   },
    { label: 'Listos',     value: contadores.listo,      cls: 'listo'     },
  ];
  return (
    <div className={styles.bar}>
      {items.map(({ label, value, cls }) => (
        <div key={cls} className={`${styles.item} ${styles[cls]}`}>
          <motion.span className={styles.value} key={value} animate={{ scale:[1.2,1] }} transition={{ duration:0.25 }}>
            {value}
          </motion.span>
          <span className={styles.label}>{label}</span>
        </div>
      ))}
    </div>
  );
}
