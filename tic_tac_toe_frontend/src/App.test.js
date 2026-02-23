import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Tic Tac Toe heading and setup flow", () => {
  render(<App />);

  const heading = screen.getByRole("heading", { name: /tic tac toe/i });
  expect(heading).toBeInTheDocument();

  // Setup flow should be shown initially
  expect(screen.getByRole("heading", { name: /players/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/player x/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/player o/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /start game/i })).toBeInTheDocument();
});
