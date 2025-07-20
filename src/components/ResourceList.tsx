import React from "react";
import { ResourceItem } from "../lib/demo-resources";

interface ResourceListProps {
  resources: ResourceItem[];
}

const ResourceList: React.FC<ResourceListProps> = ({ resources }) => {
  return (
    <div className="grid gap-4">
      {resources.map((res) => (
        <div
          key={res.id}
          className="flex items-start gap-4 p-4 border rounded shadow-sm bg-gray-50"
        >
          {res.image && (
            <img
              src={res.image}
              alt={res.name}
              className="w-16 h-16 object-cover rounded"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <a
                href={res.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-blue-700 hover:underline"
              >
                {res.name}
              </a>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">
                {res.project}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-1">{res.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResourceList;
