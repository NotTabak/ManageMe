import type { User } from "./User";

export class UserService {
  private readonly mockUser: User = {
    id: "mock-user-1",
    firstName: "Jan",
    lastName: "Kowalski",
  };

  getLoggedUser(): User {
    return this.mockUser;
  }
}
