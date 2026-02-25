export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase().replace(/\s+/g, "-")) {
    case "open":      return "bg-blue-100 text-blue-800 border-blue-200";
    case "closed":    return "bg-red-50 text-red-800 border-red-200";
    case "resolved":  return "bg-green-100 text-green-800 border-green-200";
    case "in-progress":
    case "in progress": return "bg-purple-100 text-purple-800 border-purple-200";
    case "on-hold":
    case "hold":      return "bg-amber-100 text-amber-800 border-amber-200";
    case "returned":  return "bg-purple-100 text-purple-800 border-purple-200";
    case "deleted":   return "bg-red-50 text-red-800 border-red-200";
    default:          return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case "high":   return "bg-red-100 text-red-800 border-red-200";
    case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":    return "bg-green-100 text-green-800 border-green-200";
    default:       return "bg-slate-100 text-slate-800 border-slate-200";
  }
};
