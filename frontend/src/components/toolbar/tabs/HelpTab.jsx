import { useUIStore } from '@/store';
import { Button, Tooltip } from '@/components/ui';
import { RibbonGroup } from '../RibbonGroup';

export function HelpTab() {
  const { toast, openDialog } = useUIStore();

  const openUrl = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyVersionInfo = async () => {
    const details = `EtherX Word\nBuild Date: ${new Date().toISOString()}\nUser Agent: ${navigator.userAgent}`;
    try {
      await navigator.clipboard.writeText(details);
      toast('Version info copied', 'success');
    } catch {
      toast('Clipboard blocked. Copy manually from console.', 'warning');
      console.info(details);
    }
  };

  return (
    <>
      <RibbonGroup label="Help">
        <Tooltip text="Help"><Button onClick={() => openUrl('https://support.microsoft.com/word')}>? Help</Button></Tooltip>
        <Tooltip text="Keyboard Shortcuts"><Button onClick={() => openDialog('commandMap')}>⌨ Shortcuts</Button></Tooltip>
        <Tooltip text="Contact Support"><Button onClick={() => openUrl('mailto:support@etherx.app?subject=EtherX%20Word%20Support')}>📞 Support</Button></Tooltip>
        <Tooltip text="Feedback"><Button onClick={() => openUrl('mailto:feedback@etherx.app?subject=EtherX%20Word%20Feedback')}>💬 Feedback</Button></Tooltip>
      </RibbonGroup>

      <RibbonGroup label="Show Training">
        <Tooltip text="Show Training"><Button onClick={() => openUrl('https://www.youtube.com/results?search_query=word+tutorial')}>🎓 Training</Button></Tooltip>
        <Tooltip text="What\'s New"><Button onClick={() => openUrl('https://learn.microsoft.com/en-us/office/updates/')}>🆕 What\'s New</Button></Tooltip>
      </RibbonGroup>

      <RibbonGroup label="Community">
        <Tooltip text="Community Forums"><Button onClick={() => openUrl('https://github.com/orgs/community/discussions')}>👥 Community</Button></Tooltip>
        <Tooltip text="Suggest a Feature"><Button onClick={() => openUrl('mailto:feedback@etherx.app?subject=Feature%20Suggestion')}>💡 Suggest</Button></Tooltip>
      </RibbonGroup>

      <RibbonGroup label="About">
        <Tooltip text="About EtherX Word"><Button onClick={copyVersionInfo}>ℹ About</Button></Tooltip>
        <Tooltip text="Privacy Policy"><Button onClick={() => openUrl('https://privacy.microsoft.com/en-us/privacystatement')}>🔒 Privacy</Button></Tooltip>
        <Tooltip text="Check for Updates"><Button onClick={() => openUrl('https://github.com/search?q=EtherXW&type=repositories')}>↻ Updates</Button></Tooltip>
      </RibbonGroup>
    </>
  );
}
