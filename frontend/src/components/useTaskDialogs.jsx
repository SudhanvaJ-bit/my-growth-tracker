import { useState } from "react";
import RescheduleDialog from "./RescheduleDialog";
import TaskForm from "./TaskForm";

// Shared by Dashboard, Tasks and History: opens the add/edit and reschedule dialogs.
export default function useTaskDialogs({ defaultDate, onSaved }) {
  const [form, setForm] = useState(null); // null | {task?: Task}
  const [rescheduling, setRescheduling] = useState(null);

  const dialogs = (
    <>
      {form && <TaskForm task={form.task} defaultDate={defaultDate} onClose={() => setForm(null)} onSaved={onSaved} />}
      {rescheduling && <RescheduleDialog task={rescheduling} onClose={() => setRescheduling(null)} onSaved={onSaved} />}
    </>
  );

  return {
    dialogs,
    openAdd: () => setForm({}),
    openEdit: (task) => setForm({ task }),
    openReschedule: (task) => setRescheduling(task),
  };
}
