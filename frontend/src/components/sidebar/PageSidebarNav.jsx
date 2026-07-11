import { usePageStore } from '@/store/usePageStore';
import { useUIStore } from '@/store';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePageThumb({ page, index, isActive, onClick }) {
  const theme = useUIStore((s) => s.theme);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(index)}
    >
      <div
        style={{
          width: '108px',
          height: '153px',
          margin: '8px auto',
          background: 'var(--bg-page)',
          border: isActive ? '2px solid #d4af37' : '1px solid var(--border-strong)',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: isActive ? '0 0 8px rgba(212,175,55,0.4)' : '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: theme === 'dark' ? 'var(--text-muted)' : '#666',
          transition: 'all 0.2s',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', bottom: '8px', fontSize: '10px' }}>
          Page {index + 1}
        </div>
      </div>
    </div>
  );
}

export function PageSidebarNav() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const { pages, activePage, setActivePage, reorderPages } = usePageStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      reorderPages(oldIndex, newIndex);
      
      // Force scroll to reordered page after a brief delay
      setTimeout(() => {
        const pageElements = document.querySelectorAll('.page');
        if (pageElements[newIndex]) {
          pageElements[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const scrollToPage = (index) => {
    setActivePage(index);
    const pageElements = document.querySelectorAll('.page');
    if (pageElements[index]) {
      pageElements[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!sidebarOpen) return null;

  return (
    <div
      style={{
        width: '160px',
        flexShrink: 0,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 12px 8px',
          borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--font-ui)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Pages</span>
        <span style={{ color: '#d4af37' }}>{pages.length}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {pages.map((page, index) => (
              <SortablePageThumb
                key={page.id}
                page={page}
                index={index}
                isActive={activePage === index}
                onClick={scrollToPage}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border)',
          fontFamily: 'var(--font-ui)',
          fontSize: '10px',
          color: 'var(--text-muted)',
        }}
      >
        {pages.length} page{pages.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
