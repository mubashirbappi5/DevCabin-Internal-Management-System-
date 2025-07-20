
import React, { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import ResourceList from "../components/ResourceList";
import { demoResources, ResourceItem } from "../lib/demo-resources";

const Resource: React.FC = () => {
  const [form, setForm] = useState({
    name: "",
    link: "",
    description: "",
    image: null as File | null,
    project: ""
  });
  const [resources, setResources] = useState<ResourceItem[]>(demoResources);
  const [open, setOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo, add to local state
    const newResource: ResourceItem = {
      id: resources.length + 1,
      name: form.name,
      link: form.link,
      description: form.description,
      image: form.image ? URL.createObjectURL(form.image) : undefined,
      project: form.project,
    };
    setResources([newResource, ...resources]);
    setForm({ name: "", link: "", description: "", image: null, project: "" });
    setOpen(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Resources</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow"
              onClick={() => setOpen(true)}
            >
              Add Resource
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Resource</DialogTitle>
              <DialogDescription>Fill the form to add a new resource.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <label className="block font-medium mb-1">Resource Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Resource Link (URL)</label>
                <input
                  type="url"
                  name="link"
                  value={form.link}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Optional Image</label>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Project</label>
                <input
                  type="text"
                  name="project"
                  value={form.project}
                  onChange={handleChange}
                  placeholder="Project name or ID"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Submit Resource
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <ResourceList resources={resources} />
    </div>
  );
};

export default Resource;
