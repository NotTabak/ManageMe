import type { User } from "./User";

const MOCK_USERS: User[] = [
  { id: "user-1", firstName: "Jan", lastName: "Kowalski", role: "admin" },
  { id: "user-2", firstName: "Anna", lastName: "Nowak", role: "developer" },
  { id: "user-3", firstName: "Piotr", lastName: "Wiśniewski", role: "devops" },
];

export class UserService {
  getLoggedUser(): User {
    return MOCK_USERS[0];
  }

  getAll(): User[] {
    return MOCK_USERS;
  }

  getById(id: string): User | undefined {
    return MOCK_USERS.find((u) => u.id === id);
  }

  getAssignable(): User[] {
    return MOCK_USERS.filter((u) => u.role === "developer" || u.role === "devops");
  }
}
