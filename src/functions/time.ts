/*
  Remoji - Discord emoji manager bot
  Copyright (C) 2022 Memikri <memikri1@gmail.com>.

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { performance } from "perf_hooks";
import { Awaitable } from "../types";

/**
 * Time how long a callback takes.
 *
 * @param cb - Thew callback to time.
 * @param args - The arguments for cb.
 * @returns - The time taken and the result.
 */
export async function time<T, P extends []>(
  cb: (...args: P) => Awaitable<T>,
  ...args: P
): Promise<[time: number, result: T]> {
  const before = performance.now();
  const res = await cb(...args);
  return [performance.now() - before, res];
}
