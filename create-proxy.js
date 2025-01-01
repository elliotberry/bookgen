import { promises as fs } from 'fs';
import path from 'path';

function createProxy(initialObject, fileName) {
  const filePath = path.resolve(fileName);

  // Custom function to stringify the object, handling circular references
  function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          console.warn(`Circular reference detected for key: ${key}`);
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
  }

  // Function to save the object to a file
  async function saveToFile(obj) {
    try {
      const data = safeStringify(obj);
      await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
      console.error('Error saving to file:', error);
    }
  }

  // Save the initial state to the file
  saveToFile(initialObject).catch(console.error);

  // Create a proxy to monitor and save changes
  return new Proxy(initialObject, {
    set(target, prop, value) {
      target[prop] = value;
      saveToFile(target).catch(console.error);
      return true;
    },
    deleteProperty(target, prop) {
      if (prop in target) {
        delete target[prop];
        saveToFile(target).catch(console.error);
      }
      return true;
    },
  });
}

export default createProxy;