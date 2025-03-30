import AuPlayer from '../AuPlayer';
import styles from './AuPlayWrap.module.css';

interface AuPlayerWrapProps {
    expandedMode?: boolean;
}

const AuPlayerWrap: React.FC<AuPlayerWrapProps> = ({ expandedMode = false }) => {
    console.log('[AuPlayerWrap] ExpandedMode:', expandedMode);
    
    return (
        <div className={`${styles.auPlayWrap} ${expandedMode ? styles.expanded : ''}`}>
            <div className={styles.auPlayWrapMain}>
                <AuPlayer />
            </div>
        </div>
    );
};

export default AuPlayerWrap;
