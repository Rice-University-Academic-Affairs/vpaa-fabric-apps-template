export type FixtureFacultyRow = {
	school: string;
	name: string;
	department: string;
	status: "tenured" | "tenure-track" | "pending";
	fte: number;
};

export const faculty: FixtureFacultyRow[] = [
	{ name: "Dr. Elena Martinez", department: "Computer Science", school: "School of Engineering", status: "tenured", fte: 1.0 },
	{ name: "Dr. James Chen", department: "Electrical Engineering", school: "School of Engineering", status: "tenured", fte: 1.0 },
	{ name: "Dr. Sarah Williams", department: "Bioengineering", school: "School of Engineering", status: "tenure-track", fte: 1.0 },
	{ name: "Dr. Michael Okonkwo", department: "Physics", school: "School of Natural Sciences", status: "tenured", fte: 0.75 },
	{ name: "Dr. Priya Sharma", department: "Mathematics", school: "School of Natural Sciences", status: "tenure-track", fte: 1.0 },
	{ name: "Dr. Robert Kim", department: "Chemical Engineering", school: "School of Engineering", status: "pending", fte: 1.0 },
	{ name: "Dr. Anna Bergström", department: "Mechanical Engineering", school: "School of Engineering", status: "tenured", fte: 1.0 },
	{ name: "Dr. David Okafor", department: "Statistics", school: "School of Natural Sciences", status: "tenure-track", fte: 0.5 },
	{ name: "Dr. Lisa Thompson", department: "Neuroscience", school: "School of Natural Sciences", status: "tenured", fte: 1.0 },
	{ name: "Dr. Carlos Mendez", department: "Economics", school: "School of Social Sciences", status: "pending", fte: 1.0 },
	{ name: "Dr. Emily Foster", department: "Political Science", school: "School of Social Sciences", status: "tenured", fte: 0.67 },
	{ name: "Dr. Raj Patel", department: "Architecture", school: "School of Engineering", status: "tenure-track", fte: 1.0 }
];
