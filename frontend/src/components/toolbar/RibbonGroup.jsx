export function RibbonGroup({ label, children }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRight: '1px solid var(--ribbon-divider)',
      paddingRight: 8,
      marginRight: 2,
      height: '100%',
      minWidth: 'fit-content',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, flexWrap: 'nowrap', paddingTop: 4, justifyContent: 'center' }}>
        {children}
      </div>
      <span style={{
        fontSize: 10,
        color: 'var(--text-muted)',
        letterSpacing: '.02em',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.2,
        paddingBottom: 2,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  );
}
