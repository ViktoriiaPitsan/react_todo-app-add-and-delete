/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useEffect, useRef } from 'react';
import { UserWarning } from './UserWarning';
import {
  todosService,
  TodosServiceErrors,
  todosServiceErrorText,
  USER_ID,
} from './api/todos';
import cn from 'classnames';
import { TodoItem } from './components/TodoItem';
import { TODO_STATUS_FILTER_OPTIONS, Status } from './types/TodoStatusFilter';
import { getFilteredTodos, Todo } from './types/Todo';
import { useError } from './hooks/useError';
import { TodoCreate } from './types/TodoCreate';
import { TodoCreateForm } from './components/TodoCreateForm';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodoIds, setLoadingTodoIds] = useState<Todo['id'][]>([]);
  const [selectedStatus, setSelectedStatus] = useState(Status.ALL);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  const { error, handleRemoveError, handleSetError } = useError();

  const todoTitleInputRef = useRef<HTMLInputElement>(null);

  const completedTodos = todos.filter(todo => todo.completed);

  const handleAddTodoToLoading = (todoId: Todo['id']) => {
    setLoadingTodoIds(currentLoading => [...currentLoading, todoId]);
  };

  const handleRemoveTodoFromLoading = (todoId: Todo['id']) => {
    setLoadingTodoIds(currentLoading =>
      currentLoading.filter(id => id !== todoId),
    );
  };

  const getIsTodoLoading = (todoId: Todo['id']) => {
    return loadingTodoIds.includes(todoId);
  };

  const handleDeleteTodo = (todoId: Todo['id']) => {
    handleAddTodoToLoading(todoId);
    handleRemoveError();

    todosService
      .deleTodo(todoId)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoId),
        );
      })
      .catch(() => {
        handleSetError(
          todosServiceErrorText[TodosServiceErrors.UNABLE_TO_DELETE_A_TODO],
        );
      })
      .finally(() => {
        handleRemoveTodoFromLoading(todoId);
        if (todoTitleInputRef.current) {
          todoTitleInputRef.current.focus();
        }
      });
  };

  const handleBulkDeleteTodos = (todoIds: Todo['id'][]) => {
    todoIds.forEach(todoId => handleDeleteTodo(todoId));
  };

  const handleDeleteCompleted = () => {
    handleBulkDeleteTodos(completedTodos.map(({ id }) => id));
  };

  const handleAddTodo = async (
    newTodoTitle: string,
    resetTitle: () => void,
  ) => {
    if (!todoTitleInputRef.current) {
      return;
    }

    handleRemoveError();

    const todoCreate: TodoCreate = {
      title: newTodoTitle,
      completed: false,
      userId: USER_ID,
    };

    setTempTodo({
      id: 0,
      ...todoCreate,
    });

    todoTitleInputRef.current.disabled = true;

    try {
      const createdTodo = await todosService.addTodo(todoCreate);

      setTodos(currentTodos => [...currentTodos, createdTodo]);
      resetTitle();
    } catch (err) {
      handleSetError(
        todosServiceErrorText[TodosServiceErrors.UNABLE_TO_ADD_A_TODO],
      );
    } finally {
      setTempTodo(null);
      if (!todoTitleInputRef.current) {
        return;
      }

      todoTitleInputRef.current.disabled = false;
      todoTitleInputRef.current?.focus();
    }
  };

  useEffect(() => {
    todosService
      .getTodos()
      .then(setTodos)
      .catch(() => {
        handleSetError(
          todosServiceErrorText[TodosServiceErrors.UNABLE_TO_LOAD_TODOS],
        );
      })
      .finally(() => {});
  }, [handleSetError]);

  const filteredTodos = getFilteredTodos(todos, selectedStatus);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className="todoapp__toggle-all active"
            data-cy="ToggleAllButton"
          />

          <TodoCreateForm
            ref={todoTitleInputRef}
            onSubmit={handleAddTodo}
            onError={handleSetError}
          />
        </header>

        {filteredTodos.length !== 0 && (
          <section className="todoapp__main" data-cy="TodoList">
            {filteredTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                isLoading={getIsTodoLoading(todo.id)}
                onDelete={handleDeleteTodo}
              />
            ))}

            {tempTodo && <TodoItem todo={tempTodo} isLoading />}
          </section>
        )}

        {todos.length !== 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(todo => !todo.completed).length} items left
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              {Object.entries(TODO_STATUS_FILTER_OPTIONS).map(
                ([option, { href, testId, text }]) => (
                  <a
                    key={testId}
                    href={href}
                    className={cn('filter__link', {
                      selected: selectedStatus === option,
                    })}
                    data-cy={testId}
                    onClick={event => {
                      event.preventDefault();
                      setSelectedStatus(option as Status);
                    }}
                  >
                    {text}
                  </a>
                ),
              )}
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!completedTodos.length}
              onClick={handleDeleteCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}

      <div
        data-cy="ErrorNotification"
        className={cn(
          'notification is-danger is-light has-text-weight-normal',
          {
            hidden: !error,
          },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={handleRemoveError}
        />
        {error}
      </div>
    </div>
  );
};
